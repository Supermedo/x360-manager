import { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext';
import { getTranslation } from '../translations';

export const useTranslation = () => {
  const { settings } = useContext(SettingsContext);
  const currentLanguage = settings?.language || 'en';

  const t = (key) => {
    return getTranslation(currentLanguage, key);
  };

  return { t, currentLanguage };
};

export default useTranslation;