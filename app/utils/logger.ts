// app/utils/logger.ts
type LogCategory = 'chat' | 'system' | 'note' | 'diff' | 'llm' | 'default';
type LogLevel = 'debug' | 'warn' | 'error';

let enabledCategories: LogCategory[] | 'all' = 'all';

export const logger = {
  setCategories: (categories: LogCategory[] | 'all') => {
    enabledCategories = categories;
  },
  _log: (level: LogLevel, category: LogCategory, message: string, ...args: any[]) => {
    if (__DEV__) {
      if (enabledCategories === 'all' || enabledCategories.includes(category)) {
        if (level === 'debug') {
          // For debug, print concisely without full JSON wrapper
          console.log(`[${category}] ${message}`, ...args);
        } else {
          // For warn and error, retain structured JSON with pretty-printing
          const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            category: category,
            message: message,
            data: args.length > 0 ? args : undefined,
          };
          console.log(JSON.stringify(logEntry, null, 2));
        }
      }
    }
  },
  debug: (category: LogCategory, message: string, ...args: any[]) => {
    logger._log('debug', category, message, ...args);
  },
  warn: (category: LogCategory, message: string, ...args: any[]) => {
    logger._log('warn', category, message, ...args);
  },
  error: (category: LogCategory, message: string, ...args: any[]) => {
    logger._log('error', category, message, ...args);
  },
};
