const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  resolveWritableXeniaConfigPaths,
  sanitizeXeniaToml
} = require('./xeniaConfig');
const {
  loadAccount,
  saveAccount,
  generateOfflineXuid,
  isValidPathXuid
} = require('./accountFile');

const PROFILE_FILE_RE = /^E0[0-9A-Fa-f]{14,18}$/i;
const PROFILE_CONTENT_TYPE = '00010000';
const MANIFEST_NAME = 'x360-xbox-live-profiles.json';

const hashProfilePin = (pin, profileKey) =>
  crypto.createHash('sha256').update(`${normalizeProfileKey(profileKey)}:${String(pin)}`).digest('hex');

const sanitizeProfileForClient = (profile) => {
  const { pinHash, ...rest } = profile;
  return { ...rest, hasPin: Boolean(pinHash) };
};

const sanitizeAvatar = (avatar) => {
  if (!avatar || typeof avatar !== 'object') return null;
  if (avatar.type === 'builder' && avatar.config && typeof avatar.config === 'object') {
    return { type: 'builder', config: { ...avatar.config } };
  }
  if (avatar.type === 'photo' && typeof avatar.dataUrl === 'string') {
    if (!avatar.dataUrl.startsWith('data:image/')) return null;
    if (avatar.dataUrl.length > 2 * 1024 * 1024) return null;
    return { type: 'photo', dataUrl: avatar.dataUrl };
  }
  return null;
};

const getManifestProfile = (manifest, profileKey) => {
  const key = normalizeProfileKey(profileKey);
  return manifest.profiles.find((p) => p.profileKey === key || p.id === key.toLowerCase());
};

const applyPinFields = (manifest, profileKey, pinFields = {}) => {
  const entry = getManifestProfile(manifest, profileKey);
  if (!entry) return { ok: false, error: 'Profile not found.' };

  const { currentPin, newPin, clearPin } = pinFields;
  const hasPin = Boolean(entry.pinHash);

  if (clearPin) {
    if (hasPin && entry.pinHash !== hashProfilePin(currentPin || '', profileKey)) {
      return { ok: false, error: 'Wrong PIN.' };
    }
    delete entry.pinHash;
    return { ok: true };
  }

  if (newPin !== undefined && newPin !== null && String(newPin).length > 0) {
    if (hasPin && entry.pinHash !== hashProfilePin(currentPin || '', profileKey)) {
      return { ok: false, error: 'Wrong PIN.' };
    }
    if (String(newPin).length < 4) {
      return { ok: false, error: 'PIN must be at least 4 characters.' };
    }
    entry.pinHash = hashProfilePin(newPin, profileKey);
    return { ok: true };
  }

  return { ok: true };
};

const verifyProfilePin = (userDataPath, profileKey, pin) => {
  const manifest = loadManifest(userDataPath);
  const entry = getManifestProfile(manifest, profileKey);
  if (!entry?.pinHash) return { ok: true };
  const match = entry.pinHash === hashProfilePin(pin || '', profileKey);
  return match ? { ok: true } : { ok: false, error: 'Wrong PIN.' };
};

const getManifestPath = (userDataPath) => path.join(userDataPath, MANIFEST_NAME);

const loadManifest = (userDataPath) => {
  const manifestPath = getManifestPath(userDataPath);
  if (!fs.existsSync(manifestPath)) {
    return { version: 1, profiles: [], activeProfileId: null };
  }
  try {
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return {
      version: 1,
      profiles: Array.isArray(data.profiles) ? data.profiles : [],
      activeProfileId: data.activeProfileId || null
    };
  } catch {
    return { version: 1, profiles: [], activeProfileId: null };
  }
};

const saveManifest = (userDataPath, manifest) => {
  const manifestPath = getManifestPath(userDataPath);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
};

const resolveXContentRoot = (emulatorPath, documentsPath) => {
  const emuDir = path.dirname(emulatorPath);
  const portableMarker = path.join(emuDir, 'portable.txt');
  if (fs.existsSync(portableMarker)) {
    const portableContent = path.join(emuDir, 'content');
    if (fs.existsSync(portableContent)) return portableContent;
  }
  const portableContent = path.join(emuDir, 'content');
  if (fs.existsSync(portableContent)) return portableContent;
  const docsContent = path.join(documentsPath, 'Xenia', 'content');
  if (fs.existsSync(docsContent)) return docsContent;
  return portableContent;
};

const getCanaryProfileDir = (contentRoot) =>
  path.join(contentRoot, 'FFFE07D1', '00000001');

const getAccountFilePath = (contentRoot, pathXuid) =>
  path.join(
    contentRoot,
    pathXuid,
    'FFFE07D1',
    PROFILE_CONTENT_TYPE,
    pathXuid,
    'Account'
  );

const GAMERTAG_OFFSET = 0x24;
const GAMERTAG_MAX_CHARS = 16;
const GAMERTAG_BYTE_LEN = 32;
const XUID_OFFSET = 0x44;
const MIN_PROFILE_BYTES = 0x80;

const normalizeProfileKey = (key) => {
  if (!key) return '';
  return String(key).trim().toUpperCase();
};

const normalizePathXuid = (key) => {
  const k = normalizeProfileKey(key);
  if (isValidPathXuid(k)) return k;
  if (PROFILE_FILE_RE.test(k) && k.length === 16) return k;
  return '';
};

const readUtf16Gamertag = (buffer, offset, maxChars = GAMERTAG_MAX_CHARS) => {
  let out = '';
  for (let i = 0; i < maxChars; i += 1) {
    const charOffset = offset + i * 2;
    if (charOffset + 1 >= buffer.length) break;
    const code = buffer.readUInt16LE(charOffset);
    if (code === 0) break;
    if (code < 32 || code > 126) {
      if (out.length === 0) return '';
      break;
    }
    out += String.fromCharCode(code);
  }
  return out.trim();
};

const parseGamertagFromBuffer = (buf) => {
  if (!buf || buf.length < 8) return '';
  const offsets = [GAMERTAG_OFFSET, 4, 0];
  for (const offset of offsets) {
    const tag = readUtf16Gamertag(buf, offset, GAMERTAG_MAX_CHARS);
    if (tag) return tag;
  }
  return '';
};

const profileKeyToXuidBytes = (profileKey) => {
  const k = normalizeProfileKey(profileKey);
  if (!PROFILE_FILE_RE.test(k) && !isValidPathXuid(k)) return null;
  try {
    const val = BigInt(`0x${k}`);
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(val);
    return buf;
  } catch {
    return null;
  }
};

const buildCachedUserFlags = (profile) => {
  let flags = 0;
  const country = profile.country ?? 0;
  const language = profile.language ?? 0;
  const tier = profile.subscriptionTier ?? 0;
  flags |= (country & 0xff) << 8;
  flags |= (tier & 0xf) << 20;
  flags |= (language & 0x1f) << 25;
  if (profile.xboxLiveEnabled) {
    flags |= 1;
  }
  return flags >>> 0;
};

const buildAccountInfo = (profile) => ({
  gamertag: (profile.gamertag || 'User').slice(0, 15),
  xuid: 0n,
  liveFlags: profile.xboxLiveEnabled ? 1 : 0,
  reservedFlags: profile.xboxLiveEnabled ? 2 : 0,
  cachedUserFlags: buildCachedUserFlags(profile),
  serviceProvider: '',
  passcode: [0, 0, 0, 0],
  onlineDomain: '',
  onlineKerberosRealm: '',
  onlineKey: Buffer.alloc(16, 0),
  userPassportMembername: '',
  userPassportPassword: '',
  ownerPassportMembername: ''
});

const ensureAccountFile = (contentRoot, profile) => {
  const pathXuid = normalizePathXuid(profile.pathXuid || profile.profileKey || profile.id);
  if (!pathXuid) {
    throw new Error(`Invalid profile XUID: ${profile.profileKey}`);
  }

  const accountPath = getAccountFilePath(contentRoot, pathXuid);
  const info = buildAccountInfo(profile);

  if (fs.existsSync(accountPath)) {
    try {
      const existing = loadAccount(accountPath);
      info.gamertag = profile.gamertag || existing.gamertag;
      if (!profile.country && !profile.language && existing.cachedUserFlags) {
        info.cachedUserFlags = existing.cachedUserFlags;
      }
    } catch {
      // Re-write corrupt account file
    }
  }

  saveAccount(info, accountPath);
  return { accountPath, pathXuid };
};

const writeGamertagToCanaryFile = (filePath, gamertag, profileKey) => {
  const tag = (gamertag || 'User').slice(0, 15);
  let buf = fs.existsSync(filePath)
    ? Buffer.from(fs.readFileSync(filePath))
    : Buffer.alloc(MIN_PROFILE_BYTES, 0);

  if (buf.length < MIN_PROFILE_BYTES) {
    const extended = Buffer.alloc(MIN_PROFILE_BYTES, 0);
    buf.copy(extended);
    buf = extended;
  }
  if (buf.length < GAMERTAG_OFFSET + GAMERTAG_BYTE_LEN) {
    const extended = Buffer.alloc(GAMERTAG_OFFSET + GAMERTAG_BYTE_LEN + 16, 0);
    buf.copy(extended);
    buf = extended;
  }

  buf.fill(0, GAMERTAG_OFFSET, GAMERTAG_OFFSET + GAMERTAG_BYTE_LEN);
  for (let i = 0; i < tag.length; i += 1) {
    buf.writeUInt16LE(tag.charCodeAt(i), GAMERTAG_OFFSET + i * 2);
  }

  const xuidBytes = profileKeyToXuidBytes(profileKey);
  if (xuidBytes && buf.length >= XUID_OFFSET + 8) {
    xuidBytes.copy(buf, XUID_OFFSET);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buf);
  return tag;
};

const parseCanaryProfileFile = (filePath) => {
  const fileName = path.basename(filePath);
  const profileKey = fileName.toUpperCase();
  let gamertag = '';
  let liveXuid = profileKey;

  try {
    const buf = fs.readFileSync(filePath);
    gamertag = parseGamertagFromBuffer(buf);
    if (buf.length >= XUID_OFFSET + 8) {
      const fromFile = buf.subarray(XUID_OFFSET, XUID_OFFSET + 8).toString('hex').toUpperCase();
      if (fromFile && !/^0+$/.test(fromFile)) {
        liveXuid = profileKey;
      }
    }
  } catch {
    // ignore
  }

  if (!gamertag) {
    gamertag = profileKey.replace(/^E0/i, 'Player').slice(0, 12) || 'User';
  }

  return { profileKey, gamertag, liveXuid };
};

const scanAccountProfiles = (contentRoot) => {
  if (!fs.existsSync(contentRoot)) return [];

  const profiles = [];
  for (const entry of fs.readdirSync(contentRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pathXuid = entry.name.toUpperCase();
    if (!isValidPathXuid(pathXuid)) continue;

    const accountPath = getAccountFilePath(contentRoot, pathXuid);
    if (!fs.existsSync(accountPath)) continue;

    try {
      const info = loadAccount(accountPath);
      profiles.push({
        id: pathXuid.toLowerCase(),
        profileKey: pathXuid,
        pathXuid,
        accountPath,
        filePath: accountPath,
        format: 'account',
        gamertag: info.gamertag,
        liveXuid: pathXuid,
        country: (info.cachedUserFlags >> 8) & 0xff,
        language: (info.cachedUserFlags >> 25) & 0x1f,
        subscriptionTier: (info.cachedUserFlags >> 20) & 0xf,
        xboxLiveEnabled: Boolean(info.reservedFlags & 2),
        signInState: 1,
        controllerSlot: 0,
        discovered: true
      });
    } catch (err) {
      console.warn(`[xbox-live] Could not read Account at ${accountPath}:`, err.message);
    }
  }

  return profiles;
};

const scanCanaryProfiles = (contentRoot) => {
  const storageDir = getCanaryProfileDir(contentRoot);
  if (!fs.existsSync(storageDir)) return [];

  const profiles = [];
  for (const entry of fs.readdirSync(storageDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (!PROFILE_FILE_RE.test(name)) continue;
    const filePath = path.join(storageDir, name);
    const parsed = parseCanaryProfileFile(filePath);
    const pathXuid = normalizePathXuid(parsed.profileKey);
    profiles.push({
      id: parsed.profileKey.toLowerCase(),
      profileKey: parsed.profileKey,
      pathXuid: pathXuid || parsed.profileKey,
      canaryPath: filePath,
      filePath,
      format: 'canary',
      gamertag: parsed.gamertag,
      liveXuid: parsed.liveXuid,
      country: 0,
      language: 0,
      xboxLiveEnabled: false,
      subscriptionTier: 0,
      signInState: 1,
      controllerSlot: 0,
      discovered: true
    });
  }

  return profiles.sort((a, b) => a.gamertag.localeCompare(b.gamertag));
};

const mergeProfiles = (discovered, saved) => {
  const map = new Map();

  const add = (profile) => {
    const key = normalizeProfileKey(profile.profileKey || profile.pathXuid || profile.id);
    if (!key) return;
    const existing = map.get(key);
    map.set(key, {
      ...(existing || {}),
      ...profile,
      profileKey: key,
      pathXuid: profile.pathXuid || existing?.pathXuid || key,
      filePath: profile.accountPath || profile.filePath || existing?.filePath,
      accountPath: profile.accountPath || existing?.accountPath,
      canaryPath: profile.canaryPath || existing?.canaryPath,
      format: profile.format === 'account' || existing?.format === 'account' ? 'account' : (profile.format || existing?.format),
      pinHash: profile.pinHash ?? existing?.pinHash
    });
  };

  for (const profile of discovered) add(profile);
  for (const profile of saved) {
    const key = normalizeProfileKey(profile.profileKey || profile.id);
    add({ ...profile, profileKey: key });
    if (profile.gamertag) {
      const merged = map.get(key);
      if (merged) merged.gamertag = profile.gamertag;
    }
  }

  return Array.from(map.values());
};

const listXboxLiveProfiles = (emulatorPath, documentsPath, userDataPath) => {
  if (!emulatorPath || !fs.existsSync(emulatorPath)) {
    return { ok: false, error: 'Emulator path not configured', profiles: [] };
  }

  const contentRoot = resolveXContentRoot(emulatorPath, documentsPath);
  const accountProfiles = scanAccountProfiles(contentRoot);
  const canaryProfiles = scanCanaryProfiles(contentRoot);
  const discovered = mergeProfiles([...accountProfiles, ...canaryProfiles], []);
  const manifest = loadManifest(userDataPath);
  const profiles = mergeProfiles(discovered, manifest.profiles);

  return {
    ok: true,
    contentRoot,
    storageDir: getCanaryProfileDir(contentRoot),
    profiles: profiles.map(sanitizeProfileForClient),
    activeProfileId: manifest.activeProfileId
  };
};

const createProfile = (emulatorPath, documentsPath, userDataPath, options = {}) => {
  const contentRoot = resolveXContentRoot(emulatorPath, documentsPath);
  let pathXuid = generateOfflineXuid();
  while (fs.existsSync(getAccountFilePath(contentRoot, pathXuid))) {
    pathXuid = generateOfflineXuid();
  }

  const gamertag = (options.gamertag || 'User').slice(0, 15);
  const profile = {
    id: pathXuid.toLowerCase(),
    profileKey: pathXuid,
    pathXuid,
    gamertag,
    liveXuid: pathXuid,
    country: options.country ?? 0,
    language: options.language ?? 0,
    xboxLiveEnabled: Boolean(options.xboxLiveEnabled),
    subscriptionTier: options.subscriptionTier ?? 0,
    signInState: options.xboxLiveEnabled ? 2 : 1,
    controllerSlot: options.controllerSlot ?? 0,
    avatar: sanitizeAvatar(options.avatar),
    discovered: false
  };

  const { accountPath } = ensureAccountFile(contentRoot, profile);
  profile.accountPath = accountPath;
  profile.filePath = accountPath;
  profile.format = 'account';

  const manifest = loadManifest(userDataPath);
  manifest.profiles = mergeProfiles(scanAccountProfiles(contentRoot).concat(scanCanaryProfiles(contentRoot)), [
    ...manifest.profiles,
    profile
  ]);
  manifest.activeProfileId = profile.id;

  if (options.pin && String(options.pin).length >= 4) {
    const entry = getManifestProfile(manifest, profile.profileKey);
    if (entry) entry.pinHash = hashProfilePin(options.pin, profile.profileKey);
  }

  saveManifest(userDataPath, manifest);

  try {
    applyXboxLiveProfileToConfig(emulatorPath, documentsPath, profile, { forLaunch: true });
  } catch (err) {
    return { ok: true, profile: sanitizeProfileForClient(profile), activeProfileId: profile.id, configWarning: err.message };
  }

  return { ok: true, profile: sanitizeProfileForClient(profile), activeProfileId: profile.id };
};

const importProfileFile = (emulatorPath, documentsPath, userDataPath, sourcePath) => {
  const contentRoot = resolveXContentRoot(emulatorPath, documentsPath);
  const baseName = path.basename(sourcePath).toUpperCase();
  const profileKey = PROFILE_FILE_RE.test(baseName) ? baseName : null;

  let profile;
  if (profileKey) {
    const canaryDir = getCanaryProfileDir(contentRoot);
    fs.mkdirSync(canaryDir, { recursive: true });
    const canaryPath = path.join(canaryDir, profileKey);
    fs.copyFileSync(sourcePath, canaryPath);
    const parsed = parseCanaryProfileFile(canaryPath);
    profile = {
      id: profileKey.toLowerCase(),
      profileKey,
      pathXuid: normalizePathXuid(profileKey) || profileKey,
      canaryPath,
      filePath: canaryPath,
      format: 'canary',
      gamertag: parsed.gamertag,
      liveXuid: parsed.liveXuid,
      country: 0,
      language: 0,
      xboxLiveEnabled: false,
      subscriptionTier: 0,
      signInState: 1,
      controllerSlot: 0,
      discovered: true
    };
    ensureAccountFile(contentRoot, profile);
  } else if (path.basename(sourcePath).toLowerCase() === 'account') {
    const parentXuid = path.basename(path.dirname(sourcePath)).toUpperCase();
    if (!isValidPathXuid(parentXuid)) {
      return { ok: false, error: 'Invalid Account file path.' };
    }
    const accountPath = getAccountFilePath(contentRoot, parentXuid);
    fs.mkdirSync(path.dirname(accountPath), { recursive: true });
    fs.copyFileSync(sourcePath, accountPath);
    const info = loadAccount(accountPath);
    profile = {
      id: parentXuid.toLowerCase(),
      profileKey: parentXuid,
      pathXuid: parentXuid,
      accountPath,
      filePath: accountPath,
      format: 'account',
      gamertag: info.gamertag,
      liveXuid: parentXuid,
      country: (info.cachedUserFlags >> 8) & 0xff,
      language: (info.cachedUserFlags >> 25) & 0x1f,
      subscriptionTier: (info.cachedUserFlags >> 20) & 0xf,
      xboxLiveEnabled: Boolean(info.reservedFlags & 2),
      signInState: 1,
      controllerSlot: 0,
      discovered: true
    };
  } else {
    return { ok: false, error: 'Unsupported profile file.' };
  }

  const manifest = loadManifest(userDataPath);
  manifest.profiles = mergeProfiles(
    scanAccountProfiles(contentRoot).concat(scanCanaryProfiles(contentRoot)),
    [...manifest.profiles.filter((p) => p.profileKey !== profile.profileKey), profile]
  );
  saveManifest(userDataPath, manifest);

  return { ok: true, profile };
};

const deleteProfile = (emulatorPath, documentsPath, userDataPath, profileKey) => {
  const manifest = loadManifest(userDataPath);
  const target = manifest.profiles.find((p) => p.profileKey === profileKey || p.id === profileKey);
  const contentRoot = resolveXContentRoot(emulatorPath, documentsPath);
  const key = normalizeProfileKey(target?.profileKey || profileKey);
  const pathXuid = normalizePathXuid(key);

  try {
    if (target?.canaryPath && fs.existsSync(target.canaryPath)) {
      fs.unlinkSync(target.canaryPath);
    } else if (key) {
      const canaryPath = path.join(getCanaryProfileDir(contentRoot), key);
      if (fs.existsSync(canaryPath)) fs.unlinkSync(canaryPath);
    }
    if (pathXuid) {
      const accountPath = getAccountFilePath(contentRoot, pathXuid);
      if (fs.existsSync(accountPath)) fs.unlinkSync(accountPath);
      const profileDir = path.join(contentRoot, pathXuid);
      if (fs.existsSync(profileDir)) {
        fs.rmSync(profileDir, { recursive: true, force: true });
      }
    }
    const dirPath = path.join(getCanaryProfileDir(contentRoot), `${key}.dir`);
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }

  manifest.profiles = manifest.profiles.filter((p) => p.profileKey !== profileKey && p.id !== profileKey);
  if (manifest.activeProfileId === profileKey || manifest.activeProfileId === target?.id) {
    manifest.activeProfileId = null;
  }
  saveManifest(userDataPath, manifest);
  return { ok: true };
};

const upsertProfilesSection = (content, key, value) => {
  const isString = typeof value === 'string';
  const valStr = isString ? value : typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);
  const sectionHeader = '[Profiles]';
  const keyLine = `${key} = ${valStr}`;
  let body = sanitizeXeniaToml(content || '');

  if (!body.includes(sectionHeader)) {
    return `${body.trimEnd()}\n\n${sectionHeader}\n${keyLine}\n`;
  }

  const sectionRegex = /(\[Profiles\])([\t ]*(?:\r?\n)[^\[]*)/i;
  const match = body.match(sectionRegex);
  if (!match) {
    return `${body.trimEnd()}\n\n${sectionHeader}\n${keyLine}\n`;
  }

  let block = match[2];
  const keyRegex = new RegExp(`^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=.*$`, 'm');
  block = keyRegex.test(block) ? block.replace(keyRegex, keyLine) : `${block.trimEnd()}\n${keyLine}\n`;
  return sanitizeXeniaToml(body.replace(sectionRegex, `${match[1]}${block}`));
};

const syncCanaryProfileFile = (contentRoot, profile) => {
  const profileKey = normalizeProfileKey(profile.profileKey || profile.pathXuid);
  if (!PROFILE_FILE_RE.test(profileKey)) return null;
  const canaryPath = profile.canaryPath || path.join(getCanaryProfileDir(contentRoot), profileKey);
  writeGamertagToCanaryFile(canaryPath, profile.gamertag, profileKey);
  return canaryPath;
};

const applyXboxLiveProfileToConfig = (emulatorPath, documentsPath, profile, options = {}) => {
  if (!profile) return { ok: false, error: 'No profile selected' };

  const contentRoot = resolveXContentRoot(emulatorPath, documentsPath);
  const profileKey = normalizeProfileKey(profile.profileKey || profile.pathXuid || profile.id);
  if (!profileKey || (!PROFILE_FILE_RE.test(profileKey) && !isValidPathXuid(profileKey))) {
    return { ok: false, error: `Invalid profile id "${profileKey}".` };
  }

  const pathXuid = normalizePathXuid(profileKey) || profileKey;
  const profileForAccount = { ...profile, profileKey: pathXuid, pathXuid };
  const { accountPath } = ensureAccountFile(contentRoot, profileForAccount);
  syncCanaryProfileFile(contentRoot, { ...profileForAccount, profileKey });

  const slot = options.forLaunch ? 0 : Math.min(3, Math.max(0, profile.controllerSlot ?? 0));
  const signState = profile.xboxLiveEnabled ? 2 : (profile.signInState || 1);
  const gamertag = (profile.gamertag || 'User').replace(/"/g, '');
  const xuidLiteral = `'${pathXuid}'`;

  const configPaths = resolveWritableXeniaConfigPaths(emulatorPath, documentsPath);
  for (const configPath of configPaths) {
    let content = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
    content = sanitizeXeniaToml(content);
    content = upsertProfilesSection(content, 'user_profile', `"${gamertag}"`);
    content = upsertProfilesSection(content, `user_${slot}_state`, signState);
    content = upsertProfilesSection(content, `user_${slot}_xuid`, xuidLiteral);
    content = upsertProfilesSection(content, 'max_signed_profiles', profile.maxSignedProfiles ?? 4);

    for (let i = 0; i < 4; i += 1) {
      const loggedKey = `logged_profile_slot_${i}_xuid`;
      if (i === slot) {
        content = upsertProfilesSection(content, loggedKey, xuidLiteral);
        content = upsertProfilesSection(content, `user_${i}_state`, signState);
        content = upsertProfilesSection(content, `user_${i}_xuid`, xuidLiteral);
      } else if (options.forLaunch) {
        content = upsertProfilesSection(content, loggedKey, "''");
        content = upsertProfilesSection(content, `user_${i}_state`, 0);
        content = upsertProfilesSection(content, `user_${i}_xuid`, "''");
      }
    }

    content = sanitizeXeniaToml(content);
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, content, 'utf8');
  }

  return { ok: true, configPaths, profileKey: pathXuid, accountPath, slot };
};

const saveXboxLiveProfile = (emulatorPath, documentsPath, userDataPath, profile, setActive = false) => {
  const manifest = loadManifest(userDataPath);
  const key = normalizeProfileKey(profile.profileKey || profile.id);
  const existingIdx = manifest.profiles.findIndex((p) => p.profileKey === key || p.id === profile.id);
  const incomingAvatar = profile.avatar !== undefined ? sanitizeAvatar(profile.avatar) : undefined;
  const stored = {
    ...profile,
    id: key.toLowerCase(),
    profileKey: key,
    pathXuid: normalizePathXuid(key) || key
  };
  if (incomingAvatar !== undefined) {
    stored.avatar = incomingAvatar;
  }

  if (existingIdx >= 0) {
    const previous = manifest.profiles[existingIdx];
    manifest.profiles[existingIdx] = {
      ...previous,
      ...stored,
      avatar: incomingAvatar !== undefined ? incomingAvatar : previous.avatar
    };
  } else {
    manifest.profiles.push(stored);
  }

  if (setActive) {
    manifest.activeProfileId = stored.id;
  }

  if (profile.pinFields) {
    const pinResult = applyPinFields(manifest, key, profile.pinFields);
    if (!pinResult.ok) {
      return { ok: false, error: pinResult.error };
    }
  }

  saveManifest(userDataPath, manifest);

  let applyResult;
  try {
    applyResult = applyXboxLiveProfileToConfig(emulatorPath, documentsPath, stored, { forLaunch: setActive });
    stored.accountPath = applyResult.accountPath;
    stored.filePath = applyResult.accountPath;
  } catch (err) {
    return { ok: false, error: err.message, profile: stored };
  }

  const savedEntry = getManifestProfile(manifest, key);
  return {
    ok: true,
    profile: sanitizeProfileForClient({ ...stored, pinHash: savedEntry?.pinHash }),
    activeProfileId: manifest.activeProfileId,
    configPaths: applyResult?.configPaths
  };
};

const applyActiveProfileForLaunch = (emulatorPath, documentsPath, userDataPath, profileIdOverride) => {
  const profile = getActiveXboxLiveProfile(emulatorPath, documentsPath, userDataPath, profileIdOverride);
  if (!profile) {
    return { ok: false, error: 'No gamer profile selected.' };
  }
  return applyXboxLiveProfileToConfig(emulatorPath, documentsPath, profile, { forLaunch: true });
};

/** Arcade/XBLA titles often crash if Xenia loads a signed-in profile from config. */
const clearXeniaProfilesForArcadeLaunch = (emulatorPath, documentsPath) => {
  const configPaths = resolveWritableXeniaConfigPaths(emulatorPath, documentsPath);
  for (const configPath of configPaths) {
    let content = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
    content = sanitizeXeniaToml(content);
    content = upsertProfilesSection(content, 'user_profile', '""');
    content = upsertProfilesSection(content, 'max_signed_profiles', 0);
    for (let i = 0; i < 4; i += 1) {
      content = upsertProfilesSection(content, `user_${i}_state`, 0);
      content = upsertProfilesSection(content, `user_${i}_xuid`, "''");
      content = upsertProfilesSection(content, `logged_profile_slot_${i}_xuid`, "''");
    }
    content = sanitizeXeniaToml(content);
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, content, 'utf8');
  }
  return { ok: true, configPaths };
};

const exportProfileFile = (sourcePath, destPath) => {
  fs.copyFileSync(sourcePath, destPath);
  return { ok: true, path: destPath };
};

const getActiveXboxLiveProfile = (emulatorPath, documentsPath, userDataPath, profileIdOverride = null) => {
  const listed = listXboxLiveProfiles(emulatorPath, documentsPath, userDataPath);
  if (!listed.ok || !listed.profiles.length) return null;
  const targetId = profileIdOverride || listed.activeProfileId;
  if (!targetId) return listed.profiles[0];
  return (
    listed.profiles.find(
      (p) =>
        p.id === targetId
        || p.profileKey === targetId
        || p.profileKey?.toLowerCase() === String(targetId).toLowerCase()
    ) || listed.profiles[0]
  );
};

module.exports = {
  listXboxLiveProfiles,
  saveXboxLiveProfile,
  createProfile,
  importProfileFile,
  deleteProfile,
  applyXboxLiveProfileToConfig,
  applyActiveProfileForLaunch,
  clearXeniaProfilesForArcadeLaunch,
  exportProfileFile,
  getActiveXboxLiveProfile,
  verifyProfilePin,
  resolveXContentRoot,
  getCanaryProfileDir,
  getAccountFilePath
};
