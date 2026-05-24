const fs = require('fs');
const crypto = require('crypto');

const RETAIL_KEY = Buffer.from([
  0xe1, 0xbc, 0x15, 0x9c, 0x73, 0xb1, 0xea, 0xe9, 0xab, 0x31, 0x70, 0xf3, 0xad, 0x47, 0xeb, 0xf3
]);
const DEVKIT_KEY = Buffer.from([
  0xda, 0xb6, 0x9a, 0xd9, 0x8e, 0x28, 0x76, 0x4f, 0x97, 0x7e, 0xe2, 0x48, 0x7e, 0x4f, 0x3f, 0x68
]);

const HMAC_LENGTH = 16;
const CONFOUNDER_LENGTH = 8;
const ACCOUNT_DATA_LENGTH = 380;
const TOTAL_PAYLOAD_LENGTH = CONFOUNDER_LENGTH + ACCOUNT_DATA_LENGTH;

const OFFLINE_PREFIX = BigInt('0xE030000000000000');
const DEFAULT_XUID = BigInt('0xB13EBABEBABEBABE');

const hmacSha1 = (key, data, outputLen = 16) => {
  const hmac = crypto.createHmac('sha1', key);
  hmac.update(data);
  return hmac.digest().subarray(0, outputLen);
};

const rc4 = (key, data, dataOffset, dataLen) => {
  const s = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) s[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i += 1) {
    j = (j + s[i] + key[i % key.length]) & 0xff;
    [s[i], s[j]] = [s[j], s[i]];
  }
  const output = Buffer.alloc(dataLen);
  let i1 = 0;
  let j1 = 0;
  for (let k = 0; k < dataLen; k += 1) {
    i1 = (i1 + 1) & 0xff;
    j1 = (j1 + s[i1]) & 0xff;
    [s[i1], s[j1]] = [s[j1], s[i1]];
    const b = s[(s[i1] + s[j1]) & 0xff];
    output[k] = data[dataOffset + k] ^ b;
  }
  return output;
};

const writeAsciiFixed = (dest, offset, value, fieldLen) => {
  const encoded = Buffer.from(String(value || ''), 'ascii');
  encoded.copy(dest, offset, 0, Math.min(encoded.length, fieldLen));
};

const accountToBytes = (info) => {
  const data = Buffer.alloc(ACCOUNT_DATA_LENGTH, 0);
  let offset = 0;

  data.writeUInt32BE(info.reservedFlags ?? 0, offset);
  offset += 4;
  data.writeUInt32BE(info.liveFlags ?? 0, offset);
  offset += 4;

  const gtBuf = Buffer.alloc(32, 0);
  Buffer.from(String(info.gamertag || 'User'), 'utf16le').copy(gtBuf);
  for (let i = 0; i < 16; i += 1) {
    const be = gtBuf.readUInt16LE(i * 2);
    data.writeUInt16BE(be, offset + i * 2);
  }
  offset += 32;

  const xuidVal = info.xuid != null ? BigInt(info.xuid) : 0n;
  data.writeBigUInt64BE(xuidVal, offset);
  offset += 8;

  data.writeUInt32BE(info.cachedUserFlags ?? 0, offset);
  offset += 4;
  writeAsciiFixed(data, offset, info.serviceProvider || '', 4);
  offset += 4;

  for (let i = 0; i < 4; i += 1) {
    data.writeUInt8(info.passcode?.[i] ?? 0, offset + i);
  }
  offset += 4;

  writeAsciiFixed(data, offset, info.onlineDomain || '', 20);
  offset += 20;
  writeAsciiFixed(data, offset, info.onlineKerberosRealm || '', 24);
  offset += 24;

  const onlineKey = info.onlineKey || Buffer.alloc(16, 0);
  onlineKey.copy(data, offset, 0, 16);
  offset += 16;

  writeAsciiFixed(data, offset, info.userPassportMembername || '', 114);
  offset += 114;
  writeAsciiFixed(data, offset, info.userPassportPassword || '', 32);
  offset += 32;
  writeAsciiFixed(data, offset, info.ownerPassportMembername || '', 114);

  return data;
};

const parseFromBytes = (data) => {
  if (data.length < ACCOUNT_DATA_LENGTH) {
    throw new Error(`Account data too short (${data.length} bytes)`);
  }
  let offset = 0;
  const reservedFlags = data.readUInt32BE(offset);
  offset += 4;
  const liveFlags = data.readUInt32BE(offset);
  offset += 4;

  let gamertag = '';
  for (let i = 0; i < 16; i += 1) {
    const code = data.readUInt16BE(offset + i * 2);
    if (code === 0) break;
    gamertag += String.fromCharCode(code);
  }
  offset += 32;

  const xuid = data.readBigUInt64BE(offset);
  offset += 8;
  const cachedUserFlags = data.readUInt32BE(offset);

  return {
    reservedFlags,
    liveFlags,
    gamertag: gamertag.trim() || 'User',
    xuid,
    cachedUserFlags
  };
};

const decrypt = (file, devkit = false) => {
  if (file.length < HMAC_LENGTH + TOTAL_PAYLOAD_LENGTH) {
    throw new Error('Account file too short');
  }
  const key = devkit ? DEVKIT_KEY : RETAIL_KEY;
  const fileHmac = file.subarray(0, HMAC_LENGTH);
  const rc4Key = hmacSha1(key, fileHmac);
  const encryptedPayload = file.subarray(HMAC_LENGTH, HMAC_LENGTH + TOTAL_PAYLOAD_LENGTH);
  const decryptedPayload = rc4(rc4Key, encryptedPayload, 0, TOTAL_PAYLOAD_LENGTH);
  const verifyHmac = hmacSha1(key, decryptedPayload);
  if (!fileHmac.equals(verifyHmac)) {
    throw new Error('HMAC verification failed');
  }
  const accountData = decryptedPayload.subarray(CONFOUNDER_LENGTH, TOTAL_PAYLOAD_LENGTH);
  return parseFromBytes(accountData);
};

const encrypt = (info, devkit = false) => {
  const key = devkit ? DEVKIT_KEY : RETAIL_KEY;
  const confounder = crypto.randomBytes(CONFOUNDER_LENGTH);
  const accountData = accountToBytes(info);
  const payload = Buffer.concat([confounder, accountData]);
  const hmac = hmacSha1(key, payload);
  const rc4Key = hmacSha1(key, hmac);
  const encryptedPayload = rc4(rc4Key, payload, 0, TOTAL_PAYLOAD_LENGTH);
  return Buffer.concat([hmac, encryptedPayload]);
};

const loadAccount = (filePath) => {
  const file = fs.readFileSync(filePath);
  try {
    return decrypt(file, false);
  } catch {
    return decrypt(file, true);
  }
};

const saveAccount = (info, savePath, devkit = false) => {
  const dir = require('path').dirname(savePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(savePath, encrypt(info, devkit));
};

const generateOfflineXuid = () => {
  const random = crypto.randomBytes(4).readUInt32LE(0) & 0x7fffffff;
  const value = OFFLINE_PREFIX | BigInt(random);
  return value.toString(16).toUpperCase().padStart(16, '0');
};

const isValidPathXuid = (hex) => {
  if (!hex || typeof hex !== 'string') return false;
  const normalized = hex.trim().toUpperCase();
  if (normalized.length !== 16) return false;
  if (!/^[0-9A-F]{16}$/.test(normalized)) return false;
  let value;
  try {
    value = BigInt(`0x${normalized}`);
  } catch {
    return false;
  }
  if (value === 0n) return false;
  if (value === DEFAULT_XUID) return true;
  if ((value & BigInt('0xFF00000000000000')) === BigInt('0xFE00000000000000')) return false;
  const isOffline = (value & BigInt('0xF000000000000000')) === BigInt('0xE000000000000000');
  const isOnline = (value & BigInt('0xFFFF000000000000')) === BigInt('0x0009000000000000');
  if (isOffline === isOnline) return false;
  if (isOffline && (value & BigInt('0x000000007FFFFFFF')) === 0n) return false;
  return true;
};

module.exports = {
  loadAccount,
  saveAccount,
  generateOfflineXuid,
  isValidPathXuid,
  ACCOUNT_DATA_LENGTH
};
