module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|react-native|@expo|expo|@unimodules|react-navigation|@react-navigation/.*|@sentry/.*|sentry-expo|native-base|@sentry/react-native)/)"
  ],
  testMatch: [
    "**/app/tests/**/*.test.ts",
    "**/app/__tests__/**/*.+(ts|tsx|js)?(x)",
    "**/app/features/**/*.test.tsx",
    "**/app/theme/**/*.test.tsx", // 追加: テーマ関連のテストを明示的に含める
    "**/app/services/**/*.test.ts"
  ],
};
