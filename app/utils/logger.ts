// app/utils/logger.ts
type LogCategory = 'chat' | 'system' | 'note' | 'diff' | 'llm' | 'default';

let enabledCategories: LogCategory[] | 'all' = 'all';

export const logger = {
  setCategories: (categories: LogCategory[] | 'all') => {
    enabledCategories = categories;
  },
  debug: (category: LogCategory, ...args: any[]) => {
    if (__DEV__) {
      if (enabledCategories === 'all' || enabledCategories.includes(category)) {
        console.log(`[${category}]`, ...args);
      }
    }
  },
};
