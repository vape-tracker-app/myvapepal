export function shouldPrompt(info, dismissed, now = Date.now()) {
  if (!info?.available || !Number.isSafeInteger(info.versionCode) || info.versionCode <= 0) return false;
  return dismissed?.versionCode !== info.versionCode || !Number.isFinite(dismissed?.at) ||
    now < dismissed.at || now - dismissed.at >= 24 * 60 * 60 * 1000;
}
