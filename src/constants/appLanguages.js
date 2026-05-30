/** App UI languages (not Xenia in-game languages). */
export const APP_LANGUAGES = [
  { code: 'en', nativeLabel: 'English', rtl: false },
  { code: 'ar', nativeLabel: 'العربية', rtl: true },
  { code: 'es', nativeLabel: 'Español', rtl: false },
  { code: 'fr', nativeLabel: 'Français', rtl: false },
  { code: 'de', nativeLabel: 'Deutsch', rtl: false },
  { code: 'pt', nativeLabel: 'Português', rtl: false },
  { code: 'it', nativeLabel: 'Italiano', rtl: false },
  { code: 'ru', nativeLabel: 'Русский', rtl: false },
  { code: 'ja', nativeLabel: '日本語', rtl: false },
  { code: 'ko', nativeLabel: '한국어', rtl: false },
  { code: 'zh', nativeLabel: '中文', rtl: false },
  { code: 'tr', nativeLabel: 'Türkçe', rtl: false },
  { code: 'pl', nativeLabel: 'Polski', rtl: false },
  { code: 'nl', nativeLabel: 'Nederlands', rtl: false },
  { code: 'sv', nativeLabel: 'Svenska', rtl: false },
  { code: 'nb', nativeLabel: 'Norsk', rtl: false },
  { code: 'hi', nativeLabel: 'हिन्दी', rtl: false }
];

export const isRtlLanguage = (code) =>
  APP_LANGUAGES.some((l) => l.code === code && l.rtl);

export const getAppLanguageLabel = (code) =>
  APP_LANGUAGES.find((l) => l.code === code)?.nativeLabel || code;
