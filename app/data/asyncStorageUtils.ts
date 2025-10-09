// パフォーマンス向上のためのユーティリティ
class StorageUtils {
  static async safeJsonParse<T>(jsonString: string | null): Promise<T | null> {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('JSON parse error:', error);
      return null;
    }
  }

  static convertDates(item: any): any {
    return {
      ...item,
      createdAt: new Date(item.createdAt),
      ...(item.updatedAt && { updatedAt: new Date(item.updatedAt) }),
    };
  }
}

export default StorageUtils;
