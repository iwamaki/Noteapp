---
filename:  004_migrate_file_folder_to_expo_filesystem # "[id]_[issueのタイトル]"
id: 4 # issueのユニークID
status: new # new | in-progress | blocked | pending-review | done
priority: high # A:high | B:medium | C:low
attempt_count: 0 # このissueへの挑戦回数。失敗のたびにインクリメントする
tags: [architecture, data, refactoring, filesystem, expo] # 例: [UI, navigation, bug]
---

## 概要 (Overview)

> アプリケーションのファイルおよびフォルダのデータストレージを、AsyncStorageからExpo FileSystemへ移行します。設定などの他のデータはAsyncStorageに残します。

## 背景 (Background)

> 現在のAsyncStorageベースのフラットなデータ構造では、ファイルやフォルダの階層的な管理、特にゴミ箱機能のような複雑な操作において、設計上の限界と実装の複雑さが顕在化しました。今後の機能拡張やパフォーマンスを考慮すると、より堅牢で柔軟なデータ管理システムへの移行が不可欠です。Expo FileSystemは、この要件を満たすための候補技術として選定されました。

## 実装方針 (Implementation Strategy)

> 1.  `expo-file-system` をインストールし、低レベルのファイルシステム操作をカプセル化する `fileSystemUtils.ts` を作成します。
> 2.  `storageService.ts` をリファクタリングし、ファイルとフォルダのデータアクセスに `fileSystemUtils.ts` を使用するように変更します。この際、ファイルコンテンツとメタデータを分離して保存するファイルシステム構造を定義します。
> 3.  `fileRepository.ts` と `folderRepository.ts` を更新し、リファクタリングされた `storageService.ts` と連携するようにします。
> 4.  既存のAsyncStorageデータをExpo FileSystemに移行するための一度限りの移行ロジックを実装します。
> 5.  影響を受けるすべてのモジュールで機能テストを行い、クリーンアップを行います。

## 受け入れ条件 (Acceptance Criteria)

> - [ ] `expo-file-system` がプロジェクトにインストールされていること。
> - [ ] `app/data/fileSystemUtils.ts` が作成され、基本的なファイルシステム操作を提供していること。
> - [ ] `app/data/storageService.ts` がファイルとフォルダのデータアクセスに `fileSystemUtils.ts` を使用するように変更されていること。
> - [ ] `app/data/fileRepository.ts` と `app/data/folderRepository.ts` が新しいストレージメカニズムと連携するように更新されていること。
> - [ ] 既存のファイルとフォルダのデータがAsyncStorageからExpo FileSystemに正常に移行されること。
> - [ ] アプリケーションのファイルおよびフォルダ関連のすべての機能が、移行後も正しく動作すること。
> - [ ] 設定データは引き続きAsyncStorageに保存され、正しく動作すること。

## 関連ファイル (Related Files)

> このissueに関連すると思われるファイルやディレクトリのリストです。
> LLMがコード分析を始める際のヒントになります。
>
> - `app/data/` ディレクトリ配下の全ファイル (`storageService.ts`, `fileRepository.ts`, `folderRepository.ts`, `type.ts` など)
> - `app/data/fileRepository.ts` または `app/data/folderRepository.ts` をインポートしているファイル:
>   - `app/features/chat/` 配下のハンドラおよびサービス
>   - `app/utils/debugUtils.ts`
>   - `app/screen/file-edit/services/FileService.ts`
>   - `app/screen/file-list/` 配下のユースケースおよびドメインサービス
> - `app/services/PathService.ts` (間接的に影響)
> - `package.json` (依存関係の追加)

## 制約条件 (Constraints)

> - 設定データは引き続きAsyncStorageに保存されること。
> - 既存のユーザーデータとの互換性を可能な限り維持すること。
> - アプリケーションの起動速度や操作感に悪影響を与えないこと。
> - モバイル環境での利用に適した技術を選定すること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** ファイルとフォルダのリポジトリをインポートしているすべてのソースコードを詳細に分析し、移行計画を策定しました。
- **結果:** 移行の範囲、影響を受けるファイル、および段階的な実装計画が明確になりました。
- **メモ:** `PathService` の重要性と、ファイルコンテンツとメタデータの分離を考慮したファイルシステム構造の設計が重要です。

---

## AIへの申し送り事項 (Handover to AI)

> - **現在の状況:** ファイルとフォルダのデータストレージをAsyncStorageからExpo FileSystemへ移行するための詳細な分析と計画が完了しました。
> - **次のアクション:** 計画のフェーズ1である `expo-file-system` のインストールに進んでください。
> - **考慮事項/ヒント:** 計画の各フェーズで、変更が他のモジュールに与える影響を常に考慮し、公開インターフェースの安定性を維持するように努めてください。特に、`getAll()` メソッドのパフォーマンスとデータ形式の一貫性に注意してください。
