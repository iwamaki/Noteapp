import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage to prevent errors in the Jest environment
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-get-random-values which is a dependency of uuid
jest.mock('react-native-get-random-values', () => ({
  getRandomValues: jest.fn(),
}));

// タイマーのクリーンアップ
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
