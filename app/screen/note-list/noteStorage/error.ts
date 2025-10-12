export class StorageError extends Error {
  constructor(message: string, public code: string, public originalError?: any) {
    super(message);
    this.name = 'StorageError';
  }
}
