// エラークラス
export class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'LLMError';
  }
}
