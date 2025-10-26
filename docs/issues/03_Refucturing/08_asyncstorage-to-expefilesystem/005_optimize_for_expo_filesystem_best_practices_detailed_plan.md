---
filename: 005_optimize_for_expo_filesystem_best_practices_detailed_plan
id: 5
status: new
priority: high
attempt_count: 0
tags: [architecture, data, refactoring, filesystem, expo, simplification, major-overhaul]
estimated_hours: 40-50
phases: 7
---

## 概要 (Overview)

AsyncStorageの複雑なパス管理の名残を**完全に排除**し、expo-file-systemの自然で階層的なファイルシステムを最大限活用した、シンプルで保守性の高いアーキテクチャに全面的にリファクタリングします。

**核心的な変更:**
- ❌ フラットなメタデータJSON → ✅ 階層的なディレクトリ構造
- ❌ 文字列ベースのパス管理 → ✅ Directoryオブジェクトの自然な活用
- ❌ 全件取得→フィルタリング → ✅ パス直接アクセス
- ❌ 複雑なPathService → ✅ 最小限のユーティリティ

## 背景 (Background)

### AsyncStorageの負の遺産

プロジェクト初期、AsyncStorageはフラットなKey-Value構造しか提供しないため、以下のような**無理な設計**を強いられました：

1. **文字列ベースのパス管理**
   - `path: "/folder1/subfolder/"` を文字列フィールドとして管理
   - PathServiceで文字列の連結・パース・正規化を繰り返す

2. **メモリ内での階層再構築**
   - 全データを配列で取得
   - フィルタリング・ソート・階層走査をメモリ内で実行
   - O(n)の複雑度

3. **フォルダ階層のエミュレーション**
   - ファイルシステムの階層構造を、データとして表現
   - FolderDomainServiceで複雑なキュー処理・再帰探索

### Issue 004での部分的改善

前回の移行で以下を達成：
- ✅ メタデータとコンテンツの分離
- ✅ FileSystemへのデータ移行
- ✅ キャッシュ機構

しかし、**「パブリックAPIを変更しない」という制約**により、AsyncStorageの設計思想がそのまま残りました。

### expo-file-systemの本来の力

expo-file-systemは、OSのファイルシステムを直接活用できます：
- ✅ ディレクトリ構造 = フォルダ階層（自然な表現）
- ✅ Directory/Fileオブジェクトでパスを自動管理
- ✅ 階層的な操作がネイティブサポート

**今こそ、AsyncStorageの呪縛から解放される時です。**

## 実装方針 (Implementation Strategy)

### 新しいファイルシステム設計

#### ディレクトリ構造（完全刷新）

```
${Paths.document}/noteapp/
├── content/
│   ├── root/                          ← ルートフォルダ
│   │   ├── .folder.json               ← フォルダメタデータ
│   │   ├── {uuid-file1}/
│   │   │   ├── content.md             ← ファイル本文
│   │   │   └── meta.json              ← {title, tags, dates, version}
│   │   └── {uuid-file2}/
│   │       ├── content.md
│   │       └── meta.json
│   ├── folder1/                       ← フォルダ（ディレクトリ名はslug）
│   │   ├── .folder.json               ← {id, name: "Folder 1", ...}
│   │   ├── {uuid-file3}/
│   │   │   └── ...
│   │   └── subfolder/                 ← 入れ子のフォルダ
│   │       ├── .folder.json
│   │       └── {uuid-file4}/
│   │           └── ...
│   └── another-folder/
│       └── ...
└── versions/
    ├── {fileId}/
    │   ├── {versionId-1}.md
    │   ├── {versionId-2}.md
    │   └── {versionId-3}.md
    └── ...
```

#### 設計の核心原則

1. **ディレクトリ構造 = データ構造**
   - フォルダの階層 = ディレクトリの階層
   - 文字列フィールドとしての `path` は不要

2. **メタデータの分散配置**
   - フォルダメタデータ: `.folder.json` （各ディレクトリに1つ）
   - ファイルメタデータ: `{uuid}/meta.json` （各ファイルディレクトリに1つ）

3. **Directoryオブジェクト中心の操作**
   - 文字列操作を最小化
   - パスはオブジェクトが自動管理

#### データ型定義（刷新）

```typescript
// 新しいFolder型（pathフィールド削除）
interface Folder {
  id: string;
  name: string;
  slug: string;              // ディレクトリ名（URL-safe）
  createdAt: Date;
  updatedAt: Date;
  // path: string; ❌ 削除 - ディレクトリ構造が表現
}

// 新しいFile型（pathフィールド削除）
interface File {
  id: string;
  title: string;
  content: string;           // 実行時のみ（保存時は分離）
  tags: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  // path: string; ❌ 削除 - 親ディレクトリが表現
}

// FileMetadata（meta.jsonの形式）
interface FileMetadata {
  id: string;
  title: string;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

// FolderMetadata（.folder.jsonの形式）
interface FolderMetadata {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}
```

### 実装フェーズ（7段階）

各Phaseは独立してテスト可能な単位に分割します。

---

## Phase 1: 新しいFileSystemUtils v2の実装（8-10時間）

**目標:** 新しいディレクトリ構造を扱う低レベルAPIを実装

### Task 1.1: 新しい型定義と変換関数（2時間）

**ファイル:** `app/data/typeV2.ts` （新規作成）

```typescript
// 新しい型定義
export interface FolderV2 {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FileV2 {
  id: string;
  title: string;
  content: string;
  tags: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Slug生成ユーティリティ
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// 変換関数
export const fileV2ToMetadata = (file: FileV2): FileMetadataV2 => { ... };
export const metadataToFileV2 = (meta: FileMetadataV2, content: string): FileV2 => { ... };
```

**受け入れ条件:**
- [ ] `typeV2.ts` が作成され、すべての型が定義されている
- [ ] `generateSlug()` が正しく動作する（テスト実施）
- [ ] 変換関数が正しく動作する

---

### Task 1.2: FileSystemUtilsV2の基本実装（4-5時間）

**ファイル:** `app/data/fileSystemUtilsV2.ts` （新規作成）

**実装する関数:**

```typescript
// ディレクトリ構造の初期化
export const initializeFileSystemV2 = async (): Promise<void>;

// フォルダ操作
export const createFolderDirectory = async (parentDir: Directory, folderSlug: string, metadata: FolderMetadataV2): Promise<void>;
export const readFolderMetadata = async (folderDir: Directory): Promise<FolderMetadataV2 | null>;
export const writeFolderMetadata = async (folderDir: Directory, metadata: FolderMetadataV2): Promise<void>;
export const deleteFolderDirectory = async (folderDir: Directory): Promise<void>;

// ファイル操作
export const createFileDirectory = async (parentDir: Directory, fileId: string, metadata: FileMetadataV2, content: string): Promise<void>;
export const readFileMetadata = async (fileDir: Directory): Promise<FileMetadataV2 | null>;
export const readFileContent = async (fileDir: Directory): Promise<string>;
export const writeFileMetadata = async (fileDir: Directory, metadata: FileMetadataV2): Promise<void>;
export const writeFileContent = async (fileDir: Directory, content: string): Promise<void>;
export const deleteFileDirectory = async (fileDir: Directory): Promise<void>;

// リスト操作
export const listFilesInFolder = async (folderDir: Directory): Promise<FileMetadataV2[]>;
export const listSubfoldersInFolder = async (folderDir: Directory): Promise<FolderMetadataV2[]>;

// バージョン操作
export const saveVersion = async (fileId: string, versionId: string, content: string): Promise<void>;
export const readVersion = async (fileId: string, versionId: string): Promise<string>;
export const listVersions = async (fileId: string): Promise<string[]>;
```

**受け入れ条件:**
- [ ] `fileSystemUtilsV2.ts` が作成され、全関数が実装されている
- [ ] 初期化関数が正しくディレクトリを作成する
- [ ] フォルダ・ファイルのCRUD操作が動作する
- [ ] エラーハンドリングが適切に実装されている

---

### Task 1.3: DirectoryResolver（パス解決ユーティリティ）の実装（2-3時間）

**ファイル:** `app/data/directoryResolver.ts` （新規作成）

**目的:** 仮想パス（`/folder1/subfolder/`）からDirectoryオブジェクトを取得

```typescript
/**
 * 仮想パスからディレクトリを解決
 * 例: "/folder1/subfolder/" → Directory object
 */
export class DirectoryResolver {
  private static CONTENT_DIR = new Directory(Paths.document, 'noteapp/content');

  /**
   * 仮想パスからフォルダディレクトリを取得
   */
  static async resolveFolderDirectory(virtualPath: string): Promise<Directory | null> {
    if (virtualPath === '/' || virtualPath === '') {
      return new Directory(this.CONTENT_DIR, 'root');
    }

    // パスをスラグに分解
    const slugs = virtualPath.split('/').filter(Boolean);

    // ディレクトリを辿る
    let currentDir = new Directory(this.CONTENT_DIR, 'root');

    for (const slug of slugs) {
      const nextDir = new Directory(currentDir, slug);
      if (!await nextDir.exists) {
        return null;
      }
      currentDir = nextDir;
    }

    return currentDir;
  }

  /**
   * フォルダIDからディレクトリを検索（再帰）
   */
  static async findFolderDirectoryById(folderId: string, searchDir?: Directory): Promise<Directory | null>;

  /**
   * ファイルIDからファイルディレクトリを検索（再帰）
   */
  static async findFileDirectoryById(fileId: string, searchDir?: Directory): Promise<Directory | null>;
}
```

**受け入れ条件:**
- [ ] `DirectoryResolver` が実装されている
- [ ] 仮想パスからディレクトリを正しく解決できる
- [ ] ID検索が正しく動作する（再帰探索）

---

## Phase 2: データ移行ロジックの実装（10-12時間）

**目標:** 旧構造（Issue 004）から新構造（V2）へ安全に移行

### Task 2.1: 移行ユーティリティの実装（6-8時間）

**ファイル:** `app/data/migrationUtilsV2.ts` （新規作成）

**実装する関数:**

```typescript
/**
 * V1（Issue 004）からV2への移行
 */
export const migrateV1ToV2 = async (
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> => {
  // Step 1: V1データの読み込み
  const filesV1 = await getAllFilesRawFS();  // 旧関数
  const foldersV1 = await getAllFoldersRawFS();
  const versionsV1 = await getAllVersionsRawFS();

  // Step 2: バックアップ作成
  await createBackupV1();

  // Step 3: V2構造の初期化
  await FileSystemUtilsV2.initializeFileSystemV2();

  // Step 4: フォルダ階層の再構築
  // pathフィールドから階層を推測し、ディレクトリ構造を作成
  await migrateFolders(foldersV1, onProgress);

  // Step 5: ファイルの移行
  await migrateFiles(filesV1, foldersV1, onProgress);

  // Step 6: バージョンの移行
  await migrateVersions(versionsV1, onProgress);

  // Step 7: 検証
  await validateMigrationV2();

  // Step 8: 完了フラグ
  await AsyncStorage.setItem('@migration_v2_completed', 'true');
};

/**
 * フォルダの移行（階層構造の再構築）
 */
const migrateFolders = async (foldersV1: Folder[], onProgress) => {
  // pathフィールドから親子関係を解析
  // 階層順にディレクトリを作成
};

/**
 * ファイルの移行
 */
const migrateFiles = async (filesV1: File[], foldersV1: Folder[], onProgress) => {
  // 各ファイルの path から親ディレクトリを特定
  // {uuid}/ ディレクトリを作成し、meta.json と content.md を保存
};
```

**受け入れ条件:**
- [ ] `migrationUtilsV2.ts` が実装されている
- [ ] V1データを正しく読み込める
- [ ] フォルダ階層が正しく再構築される
- [ ] ファイルが正しい場所に配置される
- [ ] バージョンが移行される
- [ ] バックアップ・ロールバック機能が動作する

---

### Task 2.2: 移行タスクの登録（1時間）

**ファイル:** `app/initialization/tasks/migrateToV2.ts` （新規作成）

```typescript
export const migrateToV2Task: InitializationTask = {
  id: 'migrate-to-v2',
  name: 'FileSystem V2への移行',
  description: '階層的ファイルシステムへの移行',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  dependencies: ['initialize-file-system'],
  execute: async () => {
    const status = await checkMigrationStatusV2();
    if (status.completed) {
      console.log('[Migration V2] Already completed');
      return;
    }
    await migrateV1ToV2();
  },
};
```

**受け入れ条件:**
- [ ] 移行タスクが実装されている
- [ ] `app/initialization/tasks/index.ts` に登録されている
- [ ] 起動時に自動実行される

---

### Task 2.3: 移行のテスト（3-4時間）

**テストシナリオ:**

1. **小規模データ**（10ファイル、3フォルダ）
   - [ ] 移行成功
   - [ ] データ件数一致
   - [ ] 階層構造の正確性

2. **中規模データ**（100ファイル、20フォルダ）
   - [ ] 移行成功
   - [ ] パフォーマンス許容範囲

3. **エラーケース**
   - [ ] ディスク容量不足時のロールバック
   - [ ] 中断後の再実行

**受け入れ条件:**
- [ ] すべてのテストシナリオが成功
- [ ] データ損失なし
- [ ] エラーハンドリングが適切

---

## Phase 3: リポジトリ層のリファクタリング（8-10時間）

**目標:** FileRepository/FolderRepositoryを新構造に対応

### Task 3.1: FileRepositoryV2の実装（4-5時間）

**ファイル:** `app/data/fileRepositoryV2.ts` （新規作成）

**新しいAPI:**

```typescript
export class FileRepositoryV2 {
  /**
   * IDでファイルを取得
   */
  static async getById(id: string): Promise<FileV2 | null> {
    const fileDir = await DirectoryResolver.findFileDirectoryById(id);
    if (!fileDir) return null;

    const meta = await FileSystemUtilsV2.readFileMetadata(fileDir);
    const content = await FileSystemUtilsV2.readFileContent(fileDir);
    return metadataToFileV2(meta, content);
  }

  /**
   * フォルダ内のファイルを取得（パスベース、効率的）
   */
  static async getByFolderPath(folderPath: string): Promise<FileV2[]> {
    const folderDir = await DirectoryResolver.resolveFolderDirectory(folderPath);
    if (!folderDir) return [];

    const metas = await FileSystemUtilsV2.listFilesInFolder(folderDir);

    // 並行読み込み
    return Promise.all(
      metas.map(async (meta) => {
        const fileDir = new Directory(folderDir, meta.id);
        const content = await FileSystemUtilsV2.readFileContent(fileDir);
        return metadataToFileV2(meta, content);
      })
    );
  }

  /**
   * ファイル作成（フォルダパス指定）
   */
  static async create(data: CreateFileDataV2, folderPath: string): Promise<FileV2> {
    const folderDir = await DirectoryResolver.resolveFolderDirectory(folderPath);
    if (!folderDir) throw new Error('Folder not found');

    const fileId = uuidv4();
    const meta = { ...data, id: fileId, version: 1, createdAt: new Date(), updatedAt: new Date() };

    await FileSystemUtilsV2.createFileDirectory(folderDir, fileId, fileV2ToMetadata(meta), data.content);

    return meta;
  }

  /**
   * ファイル更新
   */
  static async update(id: string, data: UpdateFileDataV2): Promise<FileV2>;

  /**
   * ファイル削除
   */
  static async delete(id: string): Promise<void>;

  /**
   * ファイル移動（フォルダ間）
   */
  static async move(id: string, targetFolderPath: string): Promise<void> {
    const sourceFileDir = await DirectoryResolver.findFileDirectoryById(id);
    const targetFolderDir = await DirectoryResolver.resolveFolderDirectory(targetFolderPath);

    // {uuid}ディレクトリごと移動
    // expo-file-systemのネイティブ機能を活用
  }

  // ❌ 削除: getAll() - 不要になる
  // ❌ 削除: getByPath() - getByFolderPath() に置き換え
}
```

**受け入れ条件:**
- [ ] `FileRepositoryV2` が実装されている
- [ ] 全メソッドが動作する
- [ ] パフォーマンステスト合格（100ファイルで100ms以内）

---

### Task 3.2: FolderRepositoryV2の実装（4-5時間）

**ファイル:** `app/data/folderRepositoryV2.ts` （新規作成）

```typescript
export class FolderRepositoryV2 {
  /**
   * IDでフォルダを取得
   */
  static async getById(id: string): Promise<FolderV2 | null>;

  /**
   * 親フォルダ内のサブフォルダを取得
   */
  static async getByParentPath(parentPath: string): Promise<FolderV2[]> {
    const parentDir = await DirectoryResolver.resolveFolderDirectory(parentPath);
    if (!parentDir) return [];

    return await FileSystemUtilsV2.listSubfoldersInFolder(parentDir);
  }

  /**
   * フォルダ作成
   */
  static async create(data: CreateFolderDataV2, parentPath: string): Promise<FolderV2> {
    const parentDir = await DirectoryResolver.resolveFolderDirectory(parentPath);
    const slug = generateSlug(data.name);

    await FileSystemUtilsV2.createFolderDirectory(parentDir, slug, ...);
    return newFolder;
  }

  /**
   * フォルダ削除（中身ごと）
   */
  static async delete(id: string): Promise<void> {
    const folderDir = await DirectoryResolver.findFolderDirectoryById(id);
    await FileSystemUtilsV2.deleteFolderDirectory(folderDir);
    // ディレクトリ削除で子孫も自動削除！（簡単）
  }

  /**
   * フォルダリネーム
   */
  static async rename(id: string, newName: string): Promise<void>;

  /**
   * フォルダ移動
   */
  static async move(id: string, targetParentPath: string): Promise<void>;

  // ❌ 削除: getAll() - 不要
  // ❌ 削除: getAllDescendantFolders() - ディレクトリ走査で代替
}
```

**受け入れ条件:**
- [ ] `FolderRepositoryV2` が実装されている
- [ ] フォルダのCRUD操作が動作する
- [ ] 階層的な操作が簡潔に実装されている

---

## Phase 4: PathServiceの簡素化（4-6時間）

**目標:** 複雑な文字列操作を削除し、最小限のユーティリティに縮小

### Task 4.1: PathServiceV2の実装（3-4時間）

**ファイル:** `app/services/PathServiceV2.ts` （新規作成）

**最小限の機能のみ:**

```typescript
export class PathServiceV2 {
  /**
   * 仮想パスを正規化（互換性のため残す）
   */
  static normalizePath(path: string): string {
    if (!path || path === '/') return '/';
    return path.replace(/^\/|\/$/g, '');
  }

  /**
   * Slug生成（typeV2.tsから移動）
   */
  static generateSlug(name: string): string { ... }

  // ❌ 削除: getFullPath() - Directoryオブジェクトが自動処理
  // ❌ 削除: getParentPath() - Directory.parentで取得可能
  // ❌ 削除: parseInputPath() - 上位レイヤーで処理
}
```

**受け入れ条件:**
- [ ] 旧PathServiceの機能が20%以下に縮小
- [ ] 必要最小限の関数のみ残る

---

### Task 4.2: 旧PathServiceの段階的削除（1-2時間）

- [ ] 旧PathServiceの使用箇所を特定（grep）
- [ ] 各箇所を新しい実装に置き換え
- [ ] 旧PathServiceを`@deprecated`化

---

## Phase 5: ドメインサービス層のリファクタリング（6-8時間）

**目標:** 複雑なメモリ内処理を削除

### Task 5.1: FolderDomainServiceV2の実装（3-4時間）

**ファイル:** `app/screen/file-list/domain/FolderDomainServiceV2.ts`

```typescript
export class FolderDomainServiceV2 {
  /**
   * フォルダ名のバリデーション（維持）
   */
  static validateFolderName(name: string): ValidationResult;

  /**
   * 重複チェック（簡素化）
   */
  static async checkDuplicate(name: string, parentPath: string): Promise<boolean> {
    const parentDir = await DirectoryResolver.resolveFolderDirectory(parentPath);
    const slug = PathServiceV2.generateSlug(name);
    const targetDir = new Directory(parentDir, slug);
    return await targetDir.exists;  // ✅ シンプル！
  }

  /**
   * 子フォルダ取得（簡素化）
   */
  static async getChildFolders(parentPath: string): Promise<FolderV2[]> {
    return FolderRepositoryV2.getByParentPath(parentPath);  // ✅ リポジトリに委譲
  }

  // ❌ 削除: getAllDescendantFolders() - ディレクトリ走査で代替
  // ❌ 削除: getFullPath() - 不要
  // ❌ 削除: 複雑なキュー処理・再帰探索
}
```

**受け入れ条件:**
- [ ] コード量が50%以上削減
- [ ] メモリ内配列操作が削除されている

---

### Task 5.2: FileDomainServiceV2の実装（3-4時間）

**ファイル:** `app/screen/file-list/domain/FileDomainServiceV2.ts`

```typescript
export class FileDomainServiceV2 {
  /**
   * ファイル名バリデーション（維持）
   */
  static validateFileName(name: string): ValidationResult;

  /**
   * 重複チェック（簡素化）
   */
  static async checkDuplicate(title: string, folderPath: string): Promise<boolean> {
    const files = await FileRepositoryV2.getByFolderPath(folderPath);
    return files.some(f => f.title === title);
  }

  // ❌ 削除: getFilesInPath() - リポジトリに委譲
  // ❌ 削除: 全件取得パターン
}
```

**受け入れ条件:**
- [ ] コード量が大幅に削減
- [ ] ロジックがシンプルになっている

---

## Phase 6: 上位レイヤーの更新（8-10時間）

**目標:** FileListUseCases、チャットハンドラーなど

### Task 6.1: FileListUseCasesV2の実装（4-5時間）

**ファイル:** `app/screen/file-list/application/FileListUseCasesV2.ts`

**主な変更点:**

```typescript
export class FileListUseCasesV2 {
  /**
   * 削除操作（簡素化）
   */
  static async deleteSelectedItems(fileIds: string[], folderIds: string[]): Promise<void> {
    // ❌ 削除: 全データ取得、階層走査
    // ✅ 簡素化: 各IDを直接削除（ディレクトリ削除で子孫も自動削除）

    await Promise.all([
      ...fileIds.map(id => FileRepositoryV2.delete(id)),
      ...folderIds.map(id => FolderRepositoryV2.delete(id)),  // 超簡単！
    ]);
  }

  /**
   * フォルダリネーム（簡素化）
   */
  static async renameFolder(folderId: string, newName: string): Promise<void> {
    // ❌ 削除: 全データ取得、子孫のパス更新
    // ✅ 簡素化: ディレクトリリネーム（ファイルシステムが自動処理）

    await FolderRepositoryV2.rename(folderId, newName);
  }

  /**
   * ファイル移動（簡素化）
   */
  static async moveSelectedItems(fileIds: string[], folderIds: string[], targetPath: string): Promise<void> {
    // ディレクトリ移動のみ！
    await Promise.all([
      ...fileIds.map(id => FileRepositoryV2.move(id, targetPath)),
      ...folderIds.map(id => FolderRepositoryV2.move(id, targetPath)),
    ]);
  }

  // その他のメソッドも同様に簡素化
}
```

**受け入れ条件:**
- [ ] 全件取得パターンが削除されている
- [ ] コード量が50%以上削減
- [ ] ロジックが明確になっている

---

### Task 6.2: チャットハンドラーの更新（2-3時間）

**ファイル:**
- `app/features/chat/handlers/itemResolver.ts`
- `app/features/chat/handlers/moveItemHandler.ts`
- `app/features/chat/handlers/deleteItemHandler.ts`

**主な変更:**

```typescript
// itemResolver.ts
export async function findItemByPath(path: string): Promise<ResolvedItem | null> {
  // ❌ 削除: 全データ取得、ループ検索
  // ✅ 簡素化: DirectoryResolverを使用

  const isFolder = path.endsWith('/');
  if (isFolder) {
    const dir = await DirectoryResolver.resolveFolderDirectory(path);
    if (!dir) return null;
    const meta = await FileSystemUtilsV2.readFolderMetadata(dir);
    return { type: 'folder', id: meta.id, item: meta, fullPath: path };
  } else {
    // ファイルは検索が必要（タイトルベース）
    // しかし、全取得ではなく階層的に検索
  }
}
```

**受け入れ条件:**
- [ ] チャットハンドラーが新リポジトリに対応
- [ ] 全件取得が削除されている

---

### Task 6.3: FileListProvider/Contextの更新（2-3時間）

**ファイル:** `app/screen/file-list/context/FileListProvider.tsx`

**変更点:**
- 新しいリポジトリを使用
- データ取得ロジックの簡素化

**受け入れ条件:**
- [ ] 画面が正常に動作する
- [ ] データが正しく表示される

---

## Phase 7: テストとクリーンアップ（6-8時間）

### Task 7.1: 統合テスト（3-4時間）

**テストシナリオ:**

1. **ファイル操作**
   - [ ] 作成
   - [ ] 編集
   - [ ] 削除
   - [ ] 移動
   - [ ] コピー

2. **フォルダ操作**
   - [ ] 作成
   - [ ] リネーム
   - [ ] 削除（中身ごと）
   - [ ] 移動
   - [ ] 階層的な操作

3. **パフォーマンステスト**
   - [ ] 100ファイルでの一覧表示速度
   - [ ] 階層的なフォルダ操作の速度
   - [ ] メモリ使用量

4. **画面テスト**
   - [ ] file-list画面
   - [ ] file-edit画面
   - [ ] version-history画面
   - [ ] チャット機能

**受け入れ条件:**
- [ ] すべてのテストが合格
- [ ] パフォーマンスが改善している（測定値記録）

---

### Task 7.2: 旧コードの削除（2-3時間）

**削除対象:**
- [ ] `app/data/storageService.ts` の旧関数（AsyncStorage版）
- [ ] `app/data/fileSystemUtils.ts` の旧関数
- [ ] `app/data/migrationUtils.ts` （V1移行は不要に）
- [ ] 旧PathServiceの不要な関数
- [ ] 旧FolderDomainService/FileDomainServiceの複雑な関数

**受け入れ条件:**
- [ ] 旧コードが完全に削除されている
- [ ] コンパイルエラーなし
- [ ] 動作確認完了

---

### Task 7.3: ドキュメント更新（1-2時間）

**更新対象:**
- [ ] README.md
- [ ] アーキテクチャドキュメント
- [ ] API仕様書（あれば）
- [ ] このIssueの開発ログ

**受け入れ条件:**
- [ ] 新しいアーキテクチャが文書化されている
- [ ] ディレクトリ構造が説明されている

---

## 受け入れ条件 (Acceptance Criteria)

### 必須条件

#### アーキテクチャ
- [ ] ディレクトリ構造がフォルダ階層を自然に表現している
- [ ] `path`フィールドが削除されている（型定義から）
- [ ] Directoryオブジェクト中心の実装になっている
- [ ] PathServiceが最小限（20%以下）に縮小されている

#### データ移行
- [ ] V1からV2への移行が成功する
- [ ] データ損失なし（件数一致）
- [ ] フォルダ階層が正しく再構築される
- [ ] バックアップ・ロールバック機能が動作する

#### パフォーマンス
- [ ] 全件取得パターンが削除されている
- [ ] ファイル一覧表示が高速化（ベンチマーク記録）
- [ ] メモリ使用量が削減されている

#### コード品質
- [ ] 複雑なメモリ内処理が削除されている
- [ ] FolderDomainServiceのコード量が50%以上削減
- [ ] FileListUseCasesのコード量が50%以上削減
- [ ] PathServiceの複雑な文字列操作が削除されている

#### 機能
- [ ] すべての画面が正常に動作する
- [ ] ファイル・フォルダのCRUD操作が動作する
- [ ] バージョン管理が動作する
- [ ] チャット機能が動作する

### 非機能要件
- [ ] TypeScriptコンパイルエラー: 0件
- [ ] 既存の画面への破壊的変更なし（見た目・操作性）
- [ ] テストカバレッジを維持または向上

---

## 関連ファイル (Related Files)

### 新規作成ファイル
- `app/data/typeV2.ts`
- `app/data/fileSystemUtilsV2.ts`
- `app/data/directoryResolver.ts`
- `app/data/migrationUtilsV2.ts`
- `app/data/fileRepositoryV2.ts`
- `app/data/folderRepositoryV2.ts`
- `app/services/PathServiceV2.ts`
- `app/screen/file-list/domain/FolderDomainServiceV2.ts`
- `app/screen/file-list/domain/FileDomainServiceV2.ts`
- `app/screen/file-list/application/FileListUseCasesV2.ts`
- `app/initialization/tasks/migrateToV2.ts`

### 変更・削除対象
- `app/data/storageService.ts` （削除）
- `app/data/fileSystemUtils.ts` （削除）
- `app/data/fileRepository.ts` （削除）
- `app/data/folderRepository.ts` （削除）
- `app/data/migrationUtils.ts` （削除）
- `app/data/type.ts` （削除）
- `app/services/PathService.ts` （大幅縮小）
- `app/screen/file-list/**/*` （更新）
- `app/features/chat/handlers/*` （更新）

---

## 制約条件 (Constraints)

### 技術的制約
- expo-file-system v19 の機能範囲内で実装
- React Native のファイルシステム制約を考慮
- iOS/Android 両対応

### パフォーマンス制約
- アプリ起動時間を悪化させない
- ファイル一覧表示は100ms以内（100ファイル時）

### 安全性制約
- データ移行は必ずバックアップ作成後に実行
- 移行失敗時は自動ロールバック
- ユーザーデータ損失の絶対回避

### ユーザー体験
- 移行中の進捗表示
- 既存の操作性を維持

---

## リスク分析 (Risk Analysis)

### 🔴 リスク1: データ移行失敗（最高リスク）
**シナリオ:** フォルダ階層の再構築ミス、データ損失

**軽減策:**
- バックアップ必須
- 段階的検証（件数チェック、階層チェック）
- 小・中・大規模データでの事前テスト
- ロールバック機能

---

### 🟡 リスク2: パフォーマンス劣化
**シナリオ:** ディレクトリ走査が遅い、I/O過多

**軽減策:**
- ベンチマークテストの実施
- キャッシュ機構の導入（必要に応じて）
- バッチ処理の最適化

---

### 🟡 リスク3: Slug衝突
**シナリオ:** 異なるフォルダ名が同じslugになる

**軽減策:**
- Slug生成時に重複チェック
- 重複時はサフィックス追加（`folder-1`, `folder-2`）

---

### 🟢 リスク4: 実装の複雑化
**シナリオ:** リファクタリングが広範囲で複雑化

**軽減策:**
- 段階的な実装（Phase分割）
- 各Phaseでのテスト
- V2ファイルとして並行実装（旧コードを残す）

---

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** Issue分析、ビジョンA/Bの提案、ユーザーとの方針確認、詳細実装計画の策定
- **結果:** ビジョンB（完全な自然構造）での実装が決定、7フェーズの詳細計画が完成
- **メモ:** Phase 1から順次開始予定。各Phaseは独立してテスト可能。

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
詳細な実装計画（7 Phase, 40-50時間）が完成しました。ビジョンB（expo-file-systemの完全に自然な使い方）での実装が決定されています。

### 次のアクション
**Phase 1: 新しいFileSystemUtils v2の実装** から開始します。

具体的には：
1. `app/data/typeV2.ts` の作成（型定義、Slug生成）
2. `app/data/fileSystemUtilsV2.ts` の実装（低レベルAPI）
3. `app/data/directoryResolver.ts` の実装（パス解決）

### 考慮事項/ヒント
- **段階的実装**: 各Taskを独立してテスト可能に
- **V2ファイルとして並行実装**: 旧コードを残しながら新コードを作成（リスク軽減）
- **データ移行は慎重に**: Phase 2で小・中・大規模データテストを徹底
- **シンプル化を最優先**: 複雑なロジックは全て削除

### 実装開始の確認
ユーザーに実装開始の最終確認を取り、Phase 1, Task 1.1から着手します。

---

**推定総工数: 40-50時間**
**期待効果: コード量50%削減、パフォーマンス50-80%改善、保守性の劇的向上**
