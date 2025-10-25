module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    "node_modules/(?!(@react-native|react-native|@expo|expo|expo-modules-core|@expo/vector-icons|@unimodules|react-navigation|@react-navigation/.*|@sentry/.*|sentry-expo|native-base|@sentry/react-native)/)"
  ],
  testMatch: [
    "**/app/**/*.test.+(ts|tsx)",
    "**/app/__tests__/**/*.+(ts|tsx|js)?(x)"
  ],
};
