import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { TRANSLATIONS } from './languages';

const resources: Record<string, { translation: Record<string, string> }> = {};
Object.keys(TRANSLATIONS).forEach(lang => {
  resources[lang] = { translation: TRANSLATIONS[lang] };
});

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
