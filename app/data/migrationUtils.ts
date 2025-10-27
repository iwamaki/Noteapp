/**
 * @file migrationUtils.ts
 * @summary AsyncStorage から FileSystem へのデータ移行ユーティリティ
 * @description
 * 既存ユーザーのデータを安全に AsyncStorage から FileSystem へ移行します。
 * バックアップ・リストア機能を備え、データ損失を絶対に防ぎます。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Folder, FileVersion } from './typeV1';
import {
  getAllFilesRaw,
  getAllFoldersRaw,
  getAllVersionsRaw,
  saveAllFiles,
  saveAllFolders,
  saveAllVersions,
  STORAGE_KEYS,
} from './storageService';
import * as FileSystemUtils from './fileSystemUtils';
import { fileToMetadata, folderToMetadata, versionToMetadata } from './typeV1';

// --- Constants ---
const MIGRATION_STATUS_KEY = '@migration_completed';
const BACKUP_KEYS = {
  FILES: '@migration_backup_files',
  FOLDERS: '@migration_backup_folders',
  VERSIONS: '@migration_backup_versions',
} as const;

// --- Types ---

/**
 * 移行状態
 */
export interface MigrationStatus {
  /** 移行が完了しているか */
  completed: boolean;
  /** 完了日時（ISO文字列） */
  completedAt?: string;
}

/**
 * バックアップデータ
 */
export interface MigrationBackup {
  files: File[];
  folders: Folder[];
  versions: FileVersion[];
  createdAt: string; // ISO string
}

/**
 * 移行進捗情報
 */
export interface MigrationProgress {
  /** 現在のステージ */
  stage: 'backup' | 'files' | 'folders' | 'versions' | 'validation' | 'complete';
  /** 進捗率（0-100） */
  percent: number;
  /** 現在処理中のアイテム */
  current?: number;
  /** 総アイテム数 */
  total?: number;
  /** メッセージ */
  message: string;
}

/**
 * 移行結果
 */
export interface MigrationResult {
  success: boolean;
  filesCount: number;
  foldersCount: number;
  versionsCount: number;
  duration: number; // ms
  error?: Error;
}

// --- Error Class ---
export class MigrationError extends Error {
  constructor(message: string, public code: string, public originalError?: any) {
    super(message);
    this.name = 'MigrationError';
  }
}

// --- Public Functions ---

/**
 * 移行状態をチェック
 * @returns 移行が完了しているかどうか
 */
export const checkMigrationStatus = async (): Promise<MigrationStatus> => {
  try {
    const statusValue = await AsyncStorage.getItem(MIGRATION_STATUS_KEY);
    if (statusValue === 'true') {
      const completedAt = await AsyncStorage.getItem(`${MIGRATION_STATUS_KEY}_timestamp`);
      return {
        completed: true,
        completedAt: completedAt || undefined,
      };
    }
    return {
      completed: false,
    };
  } catch (e) {
    console.error('[Migration] Failed to check migration status:', e);
    // エラー時は安全側に倒す（未移行として扱う）
    return {
      completed: false,
    };
  }
};

/**
 * AsyncStorage の全データをバックアップ
 * @returns バックアップデータ
 */
export const createBackup = async (): Promise<MigrationBackup> => {
  try {
    console.log('[Migration] Creating backup...');

    // AsyncStorage から全データを読み込み
    const files = await getAllFilesRaw();
    const folders = await getAllFoldersRaw();
    const versions = await getAllVersionsRaw();

    const backup: MigrationBackup = {
      files,
      folders,
      versions,
      createdAt: new Date().toISOString(),
    };

    // バックアップをAsyncStorageに保存
    await AsyncStorage.setItem(BACKUP_KEYS.FILES, JSON.stringify(backup.files));
    await AsyncStorage.setItem(BACKUP_KEYS.FOLDERS, JSON.stringify(backup.folders));
    await AsyncStorage.setItem(BACKUP_KEYS.VERSIONS, JSON.stringify(backup.versions));

    console.log(
      `[Migration] Backup created: ${files.length} files, ${folders.length} folders, ${versions.length} versions`
    );

    return backup;
  } catch (e) {
    throw new MigrationError('Failed to create backup', 'BACKUP_ERROR', e);
  }
};

/**
 * バックアップからリストア
 * AsyncStorage の元のデータを復元します
 */
export const restoreFromBackup = async (): Promise<void> => {
  try {
    console.log('[Migration] Restoring from backup...');

    // バックアップデータを読み込み
    const filesJson = await AsyncStorage.getItem(BACKUP_KEYS.FILES);
    const foldersJson = await AsyncStorage.getItem(BACKUP_KEYS.FOLDERS);
    const versionsJson = await AsyncStorage.getItem(BACKUP_KEYS.VERSIONS);

    if (!filesJson || !foldersJson || !versionsJson) {
      throw new MigrationError('Backup data not found', 'BACKUP_NOT_FOUND');
    }

    const files = JSON.parse(filesJson) as File[];
    const folders = JSON.parse(foldersJson) as Folder[];
    const versions = JSON.parse(versionsJson) as FileVersion[];

    // AsyncStorage に書き戻し
    await saveAllFiles(files);
    await saveAllFolders(folders);
    await saveAllVersions(versions);

    console.log(
      `[Migration] Restored from backup: ${files.length} files, ${folders.length} folders, ${versions.length} versions`
    );
  } catch (e) {
    throw new MigrationError('Failed to restore from backup', 'RESTORE_ERROR', e);
  }
};

/**
 * AsyncStorage から FileSystem へデータを移行
 * @param onProgress 進捗コールバック
 * @returns 移行結果
 */
export const migrateAsyncStorageToFileSystem = async (
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationResult> => {
  const startTime = Date.now();
  let backup: MigrationBackup | null = null;

  try {
    console.log('[Migration] Starting migration from AsyncStorage to FileSystem...');

    // Step 1: バックアップ作成
    onProgress?.({
      stage: 'backup',
      percent: 0,
      message: 'Creating backup...',
    });

    backup = await createBackup();

    onProgress?.({
      stage: 'backup',
      percent: 10,
      message: `Backup created: ${backup.files.length} files, ${backup.folders.length} folders, ${backup.versions.length} versions`,
    });

    // Step 2: FileSystem 初期化（念のため）
    await FileSystemUtils.initializeFileSystem();

    // Step 3: Files 移行
    console.log(`[Migration] Migrating ${backup.files.length} files...`);
    onProgress?.({
      stage: 'files',
      percent: 15,
      total: backup.files.length,
      current: 0,
      message: 'Migrating files...',
    });

    // ファイルメタデータとコンテンツを分離して保存
    const filesMetadata = backup.files.map(fileToMetadata);
    await FileSystemUtils.writeFilesMetadata(filesMetadata);

    // 各ファイルのコンテンツを個別に保存
    for (let i = 0; i < backup.files.length; i++) {
      const file = backup.files[i];
      await FileSystemUtils.writeFileContent(file.id, file.content);

      if (i % 10 === 0 || i === backup.files.length - 1) {
        onProgress?.({
          stage: 'files',
          percent: 15 + Math.floor((i / backup.files.length) * 30),
          total: backup.files.length,
          current: i + 1,
          message: `Migrating files... (${i + 1}/${backup.files.length})`,
        });
      }
    }

    // Step 4: Folders 移行
    console.log(`[Migration] Migrating ${backup.folders.length} folders...`);
    onProgress?.({
      stage: 'folders',
      percent: 45,
      total: backup.folders.length,
      current: 0,
      message: 'Migrating folders...',
    });

    const foldersMetadata = backup.folders.map(folderToMetadata);
    await FileSystemUtils.writeFoldersMetadata(foldersMetadata);

    onProgress?.({
      stage: 'folders',
      percent: 60,
      message: `Migrated ${backup.folders.length} folders`,
    });

    // Step 5: Versions 移行
    console.log(`[Migration] Migrating ${backup.versions.length} versions...`);
    onProgress?.({
      stage: 'versions',
      percent: 60,
      total: backup.versions.length,
      current: 0,
      message: 'Migrating versions...',
    });

    // バージョンメタデータとコンテンツを分離して保存
    const versionsMetadata = backup.versions.map(versionToMetadata);
    await FileSystemUtils.writeVersionsMetadata(versionsMetadata);

    // 各バージョンのコンテンツを個別に保存
    for (let i = 0; i < backup.versions.length; i++) {
      const version = backup.versions[i];
      await FileSystemUtils.writeVersionContent(version.id, version.content);

      if (i % 10 === 0 || i === backup.versions.length - 1) {
        onProgress?.({
          stage: 'versions',
          percent: 60 + Math.floor((i / Math.max(backup.versions.length, 1)) * 20),
          total: backup.versions.length,
          current: i + 1,
          message: `Migrating versions... (${i + 1}/${backup.versions.length})`,
        });
      }
    }

    // Step 6: 検証
    console.log('[Migration] Validating migration...');
    onProgress?.({
      stage: 'validation',
      percent: 80,
      message: 'Validating migration...',
    });

    const migratedFilesMetadata = await FileSystemUtils.readFilesMetadata();
    const migratedFoldersMetadata = await FileSystemUtils.readFoldersMetadata();
    const migratedVersionsMetadata = await FileSystemUtils.readVersionsMetadata();

    if (
      migratedFilesMetadata.length !== backup.files.length ||
      migratedFoldersMetadata.length !== backup.folders.length ||
      migratedVersionsMetadata.length !== backup.versions.length
    ) {
      throw new MigrationError(
        `Validation failed: count mismatch. Files: ${migratedFilesMetadata.length}/${backup.files.length}, Folders: ${migratedFoldersMetadata.length}/${backup.folders.length}, Versions: ${migratedVersionsMetadata.length}/${backup.versions.length}`,
        'VALIDATION_ERROR'
      );
    }

    onProgress?.({
      stage: 'validation',
      percent: 90,
      message: 'Validation successful',
    });

    // Step 7: 完了フラグ設定
    await AsyncStorage.setItem(MIGRATION_STATUS_KEY, 'true');
    await AsyncStorage.setItem(`${MIGRATION_STATUS_KEY}_timestamp`, new Date().toISOString());

    const duration = Date.now() - startTime;
    console.log(`[Migration] Migration completed successfully in ${duration}ms`);

    onProgress?.({
      stage: 'complete',
      percent: 100,
      message: 'Migration completed successfully',
    });

    return {
      success: true,
      filesCount: backup.files.length,
      foldersCount: backup.folders.length,
      versionsCount: backup.versions.length,
      duration,
    };
  } catch (error) {
    console.error('[Migration] Migration failed:', error);

    // ロールバック
    if (backup) {
      try {
        console.log('[Migration] Rolling back...');
        await restoreFromBackup();
        console.log('[Migration] Rollback successful');
      } catch (rollbackError) {
        console.error('[Migration] Rollback failed:', rollbackError);
        throw new MigrationError(
          'Migration failed and rollback also failed. Manual intervention required.',
          'CRITICAL_ERROR',
          { migrationError: error, rollbackError }
        );
      }
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      filesCount: backup?.files.length || 0,
      foldersCount: backup?.folders.length || 0,
      versionsCount: backup?.versions.length || 0,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

/**
 * バックアップをクリア（移行成功後、手動で実行）
 * 注意: この関数は移行が完全に成功し、アプリが正常に動作していることを
 * 確認した後にのみ実行してください
 */
export const clearBackup = async (): Promise<void> => {
  try {
    console.log('[Migration] Clearing backup...');
    await AsyncStorage.multiRemove([
      BACKUP_KEYS.FILES,
      BACKUP_KEYS.FOLDERS,
      BACKUP_KEYS.VERSIONS,
    ]);
    console.log('[Migration] Backup cleared');
  } catch (e) {
    console.error('[Migration] Failed to clear backup:', e);
    throw new MigrationError('Failed to clear backup', 'CLEAR_BACKUP_ERROR', e);
  }
};
