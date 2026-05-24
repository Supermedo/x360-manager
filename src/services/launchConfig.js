import { buildLaunchConfig, loadAllProfiles, resolveActiveProfile } from './xeniaProfiles';

const isLikelyArcadePath = (gamePath) => {
  if (!gamePath) return false;
  const lower = String(gamePath).toLowerCase().replace(/\\/g, '/');
  if (lower.endsWith('default.xex')) return true;
  if (!/\.[a-z0-9]+$/i.test(gamePath)) return true;
  if (/\/[0-9a-f]{8}\/[^/]+\.xex$/i.test(lower)) return true;
  return false;
};

export const buildGameLaunchConfig = (game, settings = {}) => {
  const profiles = loadAllProfiles();
  const profile = resolveActiveProfile(profiles, game, settings);
  const gameConfig = game?.config || {};

  const merged = buildLaunchConfig(profile, gameConfig, settings);
  const isArcade = game?.isArcade === true || isLikelyArcadePath(game?.path);

  return {
    ...merged,
    xeniaProfileId: isArcade ? null : (gameConfig.xeniaProfileId || null),
    xboxLiveProfileId: isArcade ? null : (gameConfig.xboxLiveProfileId || settings.activeXboxLiveProfileId || null),
    titleId: game?.titleId || game?.title_id || null,
    xeniaPresetsEnabled: isArcade ? false : settings.xeniaPresetsEnabled !== false,
    isArcade
  };
};
