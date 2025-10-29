---
filename: 100_repository_layer_refactoring
id: 100
status: new
priority: medium
attempt_count: 0
tags: [architecture, refactoring, repository, maintainability]
date: 2025/10/29
---

## 概要 (Overview)

> fileRepositoryFlat.tsが781行に肥大化し、複数の責務が混在している問題を解決するため、Repository層を単一責任の原則（SRP）に基づいて5つのファイルに分割し、保守性と可読性を向上させる。
>
> **重要**: このリファクタリングは**コードの整理**のみを目的とし、**データ構造（ストレージ）は完全フラットのまま変更しない**。

## 背景 (Background)

### 現状の問題

**fileRepositoryFlat.ts（781行）の構造的問題:**

1. **God Classアンチパターン** - 6つの異なる責務が1つのファイルに集中
   - 基本CRUD操作（create, read, update, delete）
   - バージョン管理（saveVersion, getVersions, restoreVersion）
   - メタデータ変換（metadataToFile, fileToMetadata）
   - ファイルIO操作（readFileMetadata, writeFileContent等）
   - パス管理（BASE_DIR, CONTENT_DIR等の定数）
   - エラーハンドリング

2. **具体的な問題点と影響度:**
   - **クラスの肥大化**（影響度: 最高） - FileRepositoryFlatクラスが502行
   - **ヘルパー関数の責務過多**（影響度: 高） - 194行の散乱したIO関数
   - **型変換ロジックの分離不足** - 33行の変換関数が埋め込み
   - **パス定義の分散** - ストレージパス定数が混在
   - **読み取り・書き込みの非対称性** - 対応する操作が離れた場所に配置

3. **プロジェクト内の他の実装との乖離:**
   - ValidationService.ts（96行、1責務）✅
   - ErrorService.ts（104行、1責務）✅
   - HistoryManager.ts（134行、1責務）✅
   - → これらと比較して、fileRepositoryFlat.tsは **5倍以上の行数**で**6倍の責務**を持つ

### なぜリファクタリングが必要か

- **保守性の低下**: 変更時の影響範囲が大きく、バグの混入リスクが高い
- **テスタビリティの低下**: 単体テストが困難（モック化が複雑）
- **可読性の低下**: 新規開発者のオンボーディングコストが高い
- **拡張性の欠如**: 新機能追加時にファイルがさらに肥大化する懸念

## 実装方針 (Implementation Strategy)

### リファクタリング戦略

fileRepositoryFlat.ts（781行）を **5つのファイルに分割** し、各ファイルが単一の責任を持つように設計します。

**重要な前提:**
- ✅ **データ構造（ストレージ）**: `noteapp/content/{uuid}/` の**完全フラット構造は維持**
- ✅ **コードの構成**: 可読性を優先し、`app/data/repositories/` 配下にサブディレクトリ（`storage/`）を作成
- ✅ **パス定数**: 既存のフラットなストレージ構造のパス（`BASE_DIR`, `CONTENT_DIR`等）を定義するだけで、データ構造は変更しない

#### 分割後のファイル構成（コードの整理）

```
app/data/repositories/
├── storage/                         # ストレージ層（低レベル操作）
│   ├── fileSystemPaths.ts          (~30行)  - フラットなストレージのパス定数
│   ├── fileSystemStorage.ts        (~150行) - 低レベルファイルIO操作
│   └── fileMetadataMapper.ts       (~60行)  - 型変換（DTO ↔ Entity）
├── fileRepository.ts               (~200行) - ファイルCRUD操作
└── fileVersionRepository.ts        (~180行) - バージョン管理操作
```

**データ構造は変更なし（完全フラット）:**
```
noteapp/content/
├── {file-uuid-1}/
│   ├── meta.json
│   ├── content.md
│   └── versions/
│       └── {version-uuid}/
│           ├── version_meta.json
│           └── version_content.md
├── {file-uuid-2}/
│   ├── meta.json
│   └── content.md
└── ...
```

#### 各ファイルの責務と内容

1. **storage/fileSystemPaths.ts** (~30行)
   - **責務**: フラットなストレージのパス定数を一元管理
   - **内容**:
     - `BASE_DIR`: `noteapp/` のベースパス
     - `CONTENT_DIR`: `noteapp/content/` のパス（フラット構造）
     - `VERSIONS_DIR_NAME`: `versions` ディレクトリ名
     - ファイル名定数: `meta.json`, `content.md`, `version_meta.json`, `version_content.md`
   - **理由**: パス変更時の影響範囲を最小化（データ構造は変更しない）

2. **storage/fileSystemStorage.ts** (~150行)
   - **責務**: 低レベルファイルIO操作とエラーハンドリング
   - **内容**:
     - `readFileMetadata`, `writeFileMetadata` - メタデータの読み書き
     - `readFileContent`, `writeFileContent` - コンテンツの読み書き
     - `deleteFileDirectory` - ディレクトリ削除
     - `readVersionMetadata`, `writeVersionMetadata` - バージョンメタデータ
     - `readVersionContent`, `writeVersionContent` - バージョンコンテンツ
     - `initializeFileSystemFlat` - 初期化（フラット構造のまま）
   - **理由**: ファイルシステム操作を一箇所に集約し、テスタビリティ向上

3. **storage/fileMetadataMapper.ts** (~60行)
   - **責務**: 型変換ロジック（ドメイン型 ↔ DTO型）
   - **内容**:
     - `metadataToFile`: FileMetadataFlat → FileFlat（Date変換等）
     - `fileToMetadata`: FileFlat → FileMetadataFlat（ISO string変換等）
   - **理由**: 型変換を分離し、型安全性を確保

4. **fileRepository.ts** (~200行)
   - **責務**: ファイルCRUD操作（ビジネスロジック）
   - **内容**:
     - `getAll` - 全ファイル取得（フラット構造前提）
     - `getById` - ID指定で取得
     - `getByIds` - 複数ID取得
     - `create` - ファイル作成
     - `update` - ファイル更新（バージョン管理との連携）
     - `delete` - ファイル削除
     - `batchDelete` - 一括削除
   - **理由**: ファイルの基本操作に集中し、元のコメント「~200行程度」の設計に回帰

5. **fileVersionRepository.ts** (~180行)
   - **責務**: バージョン管理専用のRepository
   - **内容**:
     - `saveVersion` - バージョン履歴の保存
     - `getVersions` - バージョン一覧取得
     - `restoreVersion` - 過去バージョンの復元
   - **理由**: バージョン管理を独立したRepositoryとして分離し、責務を明確化

### 設計原則

- **単一責任の原則（SRP）**: 各ファイルが1つの理由でのみ変更される
- **依存性逆転の原則（DIP）**: Repository → Storage の依存方向を明確化
- **開放閉鎖の原則（OCP）**: 新機能追加時に既存コードの変更を最小化
- **型安全性**: TypeScriptの型システムを最大限活用
- **エラーハンドリング**: 一貫したエラー処理パターン

### 期待される効果

| 指標 | 現状 | リファクタリング後 | 改善率 |
|------|------|-------------------|--------|
| 最大ファイル行数 | 781行 | 200行 | **74%削減** |
| 最大メソッド行数 | 185行 | 60行 | **67%削減** |
| ファイル数 | 1ファイル | 5ファイル | - |
| 責務の明確性 | 6責務混在 | 各1責務 | **SRP達成** |

## 受け入れ条件 (Acceptance Criteria)

### Phase 1: ファイル分割

- [ ] **storage/ディレクトリの作成**
  - [ ] `app/data/repositories/storage/` ディレクトリを作成

- [ ] **storage/fileSystemPaths.ts** を作成
  - [ ] BASE_DIR, CONTENT_DIR, VERSIONS_DIR_NAME等の定数を移動
  - [ ] ファイル名定数（FILE_METADATA_FILENAME等）を移動
  - [ ] エクスポートして他ファイルから参照可能にする

- [ ] **storage/fileMetadataMapper.ts** を作成
  - [ ] metadataToFile を移動（FileMetadataFlat → FileFlat）
  - [ ] fileToMetadata を移動（FileFlat → FileMetadataFlat）
  - [ ] 型変換ロジックを関数として明確に定義

- [ ] **storage/fileSystemStorage.ts** を作成
  - [ ] readFileMetadata, writeFileMetadata を移動
  - [ ] readFileContent, writeFileContent を移動
  - [ ] readVersionMetadata, writeVersionMetadata を移動
  - [ ] readVersionContent, writeVersionContent を移動
  - [ ] deleteFileDirectory を移動
  - [ ] initializeFileSystemFlat を移動

- [ ] **fileVersionRepository.ts** を作成
  - [ ] saveVersion を移動（privateからpublic staticに変更）
  - [ ] getVersions を移動
  - [ ] restoreVersion を移動
  - [ ] Storage層の関数を import して使用

- [ ] **fileRepository.ts** をリファクタリング
  - [ ] バージョン管理メソッドを削除（fileVersionRepository.tsに移譲）
  - [ ] ヘルパー関数呼び出しをStorage層のimportに変更
  - [ ] 型変換をMapper層のimportに変更
  - [ ] CRUD操作のみを保持（getAll, getById, getByIds, create, update, delete, batchDelete）

### Phase 2: 統合テスト

- [ ] 既存の全テストがパスすることを確認
- [ ] 新しいファイル構造に対する単体テストを追加
  - [ ] storage/fileSystemStorage.ts のテスト（ファイルIO操作）
  - [ ] storage/fileMetadataMapper.ts のテスト（型変換）
  - [ ] fileVersionRepository.ts のテスト（バージョン管理）
  - [ ] fileRepository.ts のテスト（CRUD統合テスト）

### Phase 3: ドキュメント更新

- [ ] 各ファイルのJSDocコメントを充実
- [ ] README.md または ARCHITECTURE.md に新しいRepository層の構造を記載
- [ ] 移行ガイド（migration guide）を作成（他の開発者向け）

### Phase 4: クリーンアップ

- [ ] fileRepositoryFlat.ts を削除または非推奨化
- [ ] インポート文を更新（既存コードで fileRepositoryFlat.ts を使用している箇所）
- [ ] 未使用のimportやコメントを削除

## 関連ファイル (Related Files)

### リファクタリング対象

- `app/data/repositories/fileRepositoryFlat.ts` (781行) - **主要なリファクタリング対象**

### 参照する型定義・エラー

- `app/data/core/typesFlat.ts` - FileFlat, FileMetadataFlat, FileVersionFlat等の型定義
- `app/data/core/errors.ts` - FileSystemV2Error, RepositoryError

### 参考にすべき実装例（プロジェクト内のベストプラクティス）

- `app/validation/ValidationService.ts` (96行, 1責務) - 単一責任の良い例
- `app/services/ErrorService.ts` (104行, 1責務) - エラーハンドリングの良い例
- `app/data/services/HistoryManager.ts` (134行, 1責務) - 適切なクラスサイズの例

### Repository層を使用している箇所（影響範囲）

- `app/data/services/metadataService.ts` - Repository層を使用するService
- その他、FileRepositoryFlatを直接importしている全ファイル（Grepで検索）

## 制約条件 (Constraints)

### 技術的制約

1. **後方互換性の維持**
   - 既存のAPIインターフェース（メソッドシグネチャ）は変更しない
   - 既存のテストは全てパスすること
   - 既存のコードからのimportパスは段階的に移行可能にする

2. **型安全性の維持**
   - TypeScriptの厳格な型チェックを通過すること
   - any型の使用は最小限にする
   - 型推論を活用し、冗長な型注釈は避ける

3. **パフォーマンス**
   - ファイルIO操作の回数を増やさない
   - 並行処理（Promise.all）は維持する
   - メモリフットプリントを増やさない

4. **エラーハンドリング**
   - FileSystemV2Error, RepositoryError の使用を継続
   - エラーメッセージは具体的で actionable にする
   - try-catchブロックの粒度を適切に保つ

### 実装上の制約

1. **expo-file-system への依存**
   - Paths, Directory, File の API を使用し続ける
   - ファイルシステム操作は非同期（async/await）で実装

2. **既存のストレージ構造の維持**
   ```
   noteapp/content/
   ├── {file-uuid-1}/
   │   ├── meta.json
   │   ├── content.md
   │   └── versions/
   │       ├── {version-uuid-1}/
   │       │   ├── version_meta.json
   │       │   └── version_content.md
   ```

3. **コーディング規約**
   - ESLint, Prettier の設定に従う
   - 既存のコードスタイルと一貫性を保つ
   - JSDocコメントは英語または日本語（プロジェクト方針に従う）

### 禁止事項

- ❌ 外部ライブラリの追加（既存の依存関係のみ使用）
- ❌ グローバル変数の使用
- ❌ デフォルトエクスポート（名前付きエクスポートのみ）
- ❌ any型の多用
- ❌ 既存のテストの削除（リファクタリングはOK）

## 開発ログ (Development Log)

---
### 調査 #0 (2025/10/29)

- **試みたこと:**
  - プロジェクト全体のアーキテクチャを "very thorough" レベルで分析
  - fileRepositoryFlat.ts の問題点を定量的に分析（行数、責務の数、メソッドサイズ）
  - プロジェクト内の他のファイル（ValidationService.ts, ErrorService.ts, HistoryManager.ts）との比較
  - Repository層のベストプラクティスを調査

- **結果:**
  - **成功** - 詳細な分析レポートを作成
  - fileRepositoryFlat.ts が 781行、6つの責務が混在していることを確認
  - 5つのファイルに分割する具体的なリファクタリングプランを策定
  - プロジェクト内の良いパターン（100行前後、1責務）を特定

- **メモ:**
  - リファクタリング後の最大ファイル行数は200行（74%削減）
  - 最大メソッド行数は60行（67%削減）
  - 単一責任の原則（SRP）を達成することで、テスタビリティと保守性が大幅に向上する見込み
  - Phase 1（ファイル分割）から段階的に実装することを推奨

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況

- **調査フェーズ完了** - fileRepositoryFlat.ts の問題点と解決策を特定済み
- **実装フェーズ未着手** - まだコードの変更は行っていない
- **Issue文書作成完了** - 本ドキュメント（100_repository_layer_refactoring.md）を作成

### 次のアクション

1. **Phase 1の実装開始** - ファイル分割を以下の順序で実行:
   1. `app/data/repositories/storage/` ディレクトリを作成
   2. `app/data/repositories/storage/fileSystemPaths.ts` を作成（依存なし）
   3. `app/data/repositories/storage/fileMetadataMapper.ts` を作成（typesFlat.tsに依存）
   4. `app/data/repositories/storage/fileSystemStorage.ts` を作成（上記2つ + expo-file-systemに依存）
   5. `app/data/repositories/fileVersionRepository.ts` を作成（Storage層に依存）
   6. `app/data/repositories/fileRepository.ts` をリファクタリング（Storage層 + fileVersionRepositoryに依存）

2. **各ステップでのテスト実行** - 新しいファイルを作成するたびに、既存のテストがパスすることを確認

3. **インポートパスの更新** - 既存コードが新しいファイル構造を使用するように段階的に移行

4. **旧ファイルの削除** - 移行完了後、元の fileRepositoryFlat.ts を削除または非推奨化

### 考慮事項/ヒント

- **依存関係の順序に注意**: storage/fileSystemPaths.ts → storage/fileMetadataMapper.ts → storage/fileSystemStorage.ts の順で作成すると、各ファイルが前のファイルに依存できる
- **段階的な移行**: fileRepositoryFlat.ts は削除せず、まず新しいファイルを作成してから段階的に移行する（リスク低減）
- **参考実装**: ValidationService.ts（96行）や ErrorService.ts（104行）を参考に、適切なファイルサイズと責務分離を維持
- **テストの重要性**: 各Phase完了後に必ずテストを実行し、回帰バグがないことを確認
- **ドキュメント**: 各ファイルにJSDocコメントを充実させ、次の開発者が理解しやすいコードにする

### 実装時の重要なポイント

1. **型安全性**: TypeScriptの型推論を活用し、型注釈は必要最小限に
2. **エラーハンドリング**: FileSystemV2Error を一貫して使用
3. **非同期処理**: async/await と Promise.all を適切に組み合わせる
4. **命名規則**: プロジェクトの既存の命名規則（camelCase, PascalCase）に従う
5. **コメント**: 複雑なロジックには日本語コメントを追加（プロジェクト方針に合わせる）

このIssueを読めば、次のセッションでAIが迷うことなくリファクタリング作業を開始できます。

---
