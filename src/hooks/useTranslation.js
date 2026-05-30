import { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import { getTranslation } from '../translations';
import { isRtlLanguage, getAppLanguageLabel } from '../constants/appLanguages';

export const useTranslation = () => {
  const { settings } = useContext(SettingsContext);
  const currentLanguage = settings?.language || 'en';

  const t = (key) => getTranslation(currentLanguage, key);

  return {
    t,
    currentLanguage,
    isRtl: isRtlLanguage(currentLanguage),
    languageLabel: getAppLanguageLabel(currentLanguage)
  };
};

export default useTranslation;
