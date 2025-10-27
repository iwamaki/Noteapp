---
filename: 001_refactor_file_system_to_flat_expo
id: 1
status: new
priority: high
attempt_count: 0
tags: [file-system, refactoring, expo, async-storage]
---

## 概要 (Overview)

asyncStorage でエミュレートしていた多層ディレクトリ構造を廃止し、expo-file-system を用いたフラットなファイル管理システムへ移行する。これにより、現在のパスシステムに起因する複雑性とエラーを解消する。

## 背景 (Background)

現在、ノートアプリのファイル管理は asyncStorage を利用し、その上に多層ディレクトリ構造を無理に構築している。この実装は複雑で、パス解決のロジックがエラーの根源となっている。expo-file-system への移行を進めているが、既存の複雑な構造が移行作業を困難にしている。まずはフラットな管理に移行することで、実装を単純化し、安定性を確保する。将来的には expo-file-system 上で多層構造を再構築する計画である。

## 実装方針 (Implementation Strategy)

*   asyncStorage に保存されている既存の多層構造データを、expo-file-system 上のフラットな構造に移行するロジックを実装する。
*   ファイルパスの管理を、階層構造を意識しないシンプルなIDベースまたはフラットな命名規則に変更する。
*   asyncStorage への依存を排除し、すべてのファイル操作を expo-file-system に集約する。
*   データ移行の安全性を確保するため、移行前後のデータ整合性チェックを導入する。

## 受け入れ条件 (Acceptance Criteria)

*   [ ] 既存のノートデータが expo-file-system へ正しく移行されること。
*   [ ] アプリケーションが asyncStorage に依存せず、expo-file-system のみでファイル操作を行えること。
*   [ ] ファイルの保存、読み込み、更新、削除がフラットな構造で正常に機能すること。
*   [ ] 移行後も既存の機能（ノートの表示、編集など）が問題なく動作すること。

## 関連ファイル (Related Files)

*   `app/screen/file-list/FileListScreen.tsx` (ファイル一覧表示)
*   `app/screen/file-edit/FileEditScreen.tsx` (ファイル編集画面)
*   `app/features/chat/` (チャット機能 - ファイル操作に関連する可能性)
*   `app/initialization/tasks/` (初期化タスク - ファイルシステム初期化、データ移行に関連)
*   `app/App.tsx` (アプリケーション全体のエントリポイント、初期化処理など)

## 制約条件 (Constraints)

*   ユーザーデータが失われないことを最優先とする。
*   既存のUI/UXに大きな変更を加えない範囲で実装する。
*   移行期間中のアプリの安定性を確保する。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
- **結果:**
- **メモ:**

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:**
- **次のアクション:**
- **考慮事項/ヒント:**
