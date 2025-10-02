// app/utils/logger.ts
export const logger = {
  debug: (...args: any[]) => {
    if (__DEV__) {
      console.log(...args);
    }
  }
};
