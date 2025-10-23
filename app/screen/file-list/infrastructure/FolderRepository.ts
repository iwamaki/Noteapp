/**
 * @file FolderRepository.ts
 * @summary フォルダデータアクセス層（レガシー互換性レイヤー）
 * @description
 * 新しい統一リポジトリ（app/data/folderRepository.ts）への再エクスポート。
 * 既存のコードとの互換性を保ちつつ、段階的な移行を可能にします。
 */

import { FolderRepository as UnifiedFolderRepository } from '@data/folderRepository';

// 統一リポジトリをそのまま再エクスポート
export const FolderRepository = UnifiedFolderRepository;
