import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import ja from './locales/ja.json';
import en from './locales/en.json';

export const resources = {
  ja: { translation: ja },
  en: { translation: en },
} as const;

export type Language = keyof typeof resources;

// デバイスの言語を取得
export const getDeviceLanguage = (): Language => {
  const locale = Localization.getLocales()[0];
  const languageCode = locale?.languageCode || 'ja';

  // サポートされている言語かチェック
  if (languageCode in resources) {
    return languageCode as Language;
  }

  // デフォルトは日本語
  return 'ja';
};

// 言語を変更する関数
export const changeLanguage = async (language: Language): Promise<void> => {
  await i18n.changeLanguage(language);
};

// i18nextの初期化
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    lng: 'ja', // 初期値（後でloadSettingsから設定される）
    fallbackLng: 'ja',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
