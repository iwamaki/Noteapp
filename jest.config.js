module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo/.*|@expo/.*|expo-modules-core/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|uuid)"
  ],
  testMatch: [
    "**/src/tests/**/*.test.ts",
    "**/src/__tests__/**/*.+(ts|tsx|js)?(x)"
  ],
};
