---
filename: 005_optimize_for_expo_filesystem_best_practices
id: 5
status: new
priority: high
attempt_count: 0
tags: [architecture, data, refactoring, filesystem, expo, performance, optimization]
---

## 概要 (Overview)

既存のファイル/フォルダ管理システムを、`expo-file-system` の特性とベストプラクティスに沿って最適化し、システムのパフォーマンス、堅牢性、保守性を向上させる。AsyncStorageからの移行は完了したが、`expo-file-system`の機能を最大限に活用するよう、アーキテクチャレベルでの見直しとリファクタリングを行う。

## 背景 (Background)

以前のIssue (`004_migrate_file_folder_to_expo_filesystem_detailed.md`) で、ファイルとフォルダのデータストレージをAsyncStorageからExpo FileSystemへ移行した。この移行は、既存のパブリックAPIを変更しないという制約の下で行われたため、内部実装はFileSystemベースになったものの、リポジトリ層のインターフェースや、それを利用する上位レイヤーのロジックには、AsyncStorage時代の「名残」が残っている可能性がある。

`expo-file-system` は階層的なファイル構造、効率的なI/O、ネットワーク操作など、AsyncStorageにはない強力な機能を提供する。これらの機能を深くプロジェクトに溶け込ませることで、より直感的で効率的なファイル管理システムを構築し、将来的な機能拡張（例: クラウド同期、差分バージョン管理）の基盤を強化する必要がある。

## 実装方針 (Implementation Strategy)

1.  **リポジトリ層のインターフェース再設計**:
    *   `FileRepository` および `FolderRepository` のパブリックAPIを、`expo-file-system` のパスベースの操作や階層構造をより自然に扱えるように見直す。
    *   `getAllFiles()` のような一括取得ではなく、特定のパス以下のファイルを効率的に取得するAPIの導入を検討する。
2.  **`storageService.ts` のクリーンアップと最適化**:
    *   `migrationUtils.ts` でのみ使用されるAsyncStorage版の関数を、移行完了後に完全に削除する計画を立てる。
    *   `MetadataCache` のキャッシュ戦略が、`expo-file-system` の特性とアプリケーションのアクセスパターンに最適化されているか再検討する。
3.  **上位レイヤーのロジック最適化**:
    *   `FileRepository` や `FolderRepository` を利用する上位レイヤー（例: `FileListUseCases`、チャットハンドラーなど）のロジックが、`AsyncStorage` の「全件取得してからフィルタリング」のようなパターンになっていないか分析し、`expo-file-system` の階層構造を活かした効率的な検索、フィルタリング、移動、削除などの操作にリファクタリングする。
4.  **`expo-file-system` 固有機能の活用**:
    *   `readFromOffsetAsync`/`writeFromOffsetAsync` を利用した差分ベースのバージョン管理の可能性を検討する。
    *   `downloadAsync`/`uploadAsync` を利用したクラウド同期機能の基盤設計を行う。
    *   `getInfoAsync` を活用した整合性チェックや同期処理の効率化を検討する。
5.  **エラーハンドリングと堅牢性の強化**:
    *   `expo-file-system` 固有のエラー（権限、パスの存在など）に対するより詳細でユーザーフレンドリーなエラーハンドリングを導入する。
    *   ファイル操作のトランザクション性や整合性確保のための戦略を検討する。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `FileRepository` および `FolderRepository` のパブリックAPIが、`expo-file-system` の特性をより良く反映するように再設計されていること。
- [ ] `storageService.ts` からAsyncStorage関連のコードが完全に削除されていること（または削除計画が明確であること）。
- [ ] 上位レイヤーのファイル/フォルダ操作ロジックが、`expo-file-system` の階層構造を効率的に利用するようにリファクタリングされていること。
- [ ] `expo-file-system` の主要機能（例: オフセットI/O、ネットワーク操作）を活用した具体的な改善案または実装が導入されていること。
- [ ] `expo-file-system` 固有のエラーに対する堅牢なエラーハンドリングが実装されていること。
- [ ] パフォーマンス測定により、ファイル/フォルダ操作の効率が向上していることが確認できること。

## 関連ファイル (Related Files)

- `app/data/fileRepository.ts`
- `app/data/folderRepository.ts`
- `app/data/storageService.ts`
- `app/data/fileSystemUtils.ts`
- `app/data/type.ts`
- `app/services/PathService.ts`
- `app/screen/file-list/` (およびそのサブディレクトリ)
- `app/features/chat/` (およびそのサブディレクトリ)
- `app/initialization/tasks/` (特に `initializeFileSystem.ts`)
- `docs/issues/03_Refucturing/08_asyncstorage-to-expefilesystem/004_migrate_file_folder_to_expo_filesystem_detailed.md`

## 制約条件 (Constraints)

- 既存のユーザーデータ（移行済みのFileSystemデータ）の整合性を維持すること。
- アプリケーションの起動時間やUIの応答性に悪影響を与えないこと。
- 既存のテストカバレッジを維持または向上させること。
- `expo-file-system` の提供するAPIの範囲内で実装すること。
- ユーザー体験を損なわないこと。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （このIssueの作業を開始した際に記録）
- **結果:**
- **メモ:**

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `expo-file-system` へのデータ移行は完了し、AsyncStorage版の関数は非推奨化された。しかし、プロジェクト全体が`expo-file-system`の特性を最大限に活かすようには最適化されていない。
- **次のアクション:** このIssueの「実装方針」セクションに記載された項目に基づき、プロジェクトの分析とリファクタリング計画の策定を開始する。特に、リポジトリ層のインターフェース再設計と、上位レイヤーのロジック最適化に焦点を当てる。
- **考慮事項/ヒント:** `FileRepository`と`FolderRepository`の現在の利用箇所を詳細に調査し、どのようなAPIが`expo-file-system`のベストプラクティスに合致するかを検討することが重要。
