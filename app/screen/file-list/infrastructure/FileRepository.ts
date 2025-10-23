/**
 * @file FileRepository.ts
 * @summary ファイルデータアクセス層（レガシー互換性レイヤー）
 * @description
 * 新しい統一リポジトリ（app/data/fileRepository.ts）への再エクスポート。
 * 既存のコードとの互換性を保ちつつ、段階的な移行を可能にします。
 */

import { FileRepository as UnifiedFileRepository } from '@data/fileRepository';

// 統一リポジトリをそのまま再エクスポート
export const FileRepository = UnifiedFileRepository;
