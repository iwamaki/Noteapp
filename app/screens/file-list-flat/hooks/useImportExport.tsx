/**
 * @file useImportExport.tsx
 * @summary インポート/エクスポート機能を提供するフック
 * @description
 * ファイルのインポート（JSONファイルから読み込み）とエクスポート（ZIPにまとめたMarkdownファイル）を行う。
 * エクスポート時はシステム共有ダイアログを表示し、インポート時は未分類として新規ファイルを作成する。
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import { Paths, Directory, File as FSFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { FileRepository } from '@data/repositories/fileRepository';
import { CreateFileDataFlat, FileFlat } from '@data/core/typesFlat';
import { logger } from '../../../utils/logger';
import {
  sanitizeFilename,
  sanitizeCategoryPathForFileSystem,
  sanitizeDateForFilename,
  filterFilesByCategory,
  getCategoryNameFromPath,
  generateUniqueKey,
  resolveDuplicateTitle,
  getExistingTitlesSet,
} from '../utils';
import { UseImportExportReturn } from '../types';

/**
 * インポート用のJSONデータ構造
 */
interface ImportFileData {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

/**
 * インポート/エクスポート機能を提供するフック
 */
export const useImportExport = (): UseImportExportReturn => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * ファイルをZIPにまとめてエクスポートする共通処理
   */
  const exportFilesToZip = async (files: FileFlat[], zipFileName: string) => {
    if (files.length === 0) {
      Alert.alert(t('importExport.export.title'), t('importExport.export.noFiles'));
      return;
    }

    // ZIPファイルを作成
    const zip = new JSZip();

    // 各ファイルをMarkdownとしてZIPに追加
    const filenameCount = new Map<string, number>();

    for (const file of files) {
      // ファイル名をサニタイズ
      let filename = sanitizeFilename(file.title);

      // カテゴリパスを構築（階層構造を保持）
      let categoryPath = '';
      if (file.category && file.category.trim() !== '') {
        // カテゴリの各階層をサニタイズ
        const sanitizedCategory = sanitizeCategoryPathForFileSystem(file.category);
        categoryPath = sanitizedCategory ? sanitizedCategory + '/' : '';
      }

      // フルパス（カテゴリ + ファイル名）を作成
      const fullPath = `${categoryPath}${filename}`;

      // 重複チェック（同じパスの場合は番号を付ける）
      if (filenameCount.has(fullPath)) {
        const count = filenameCount.get(fullPath)! + 1;
        filenameCount.set(fullPath, count);
        filename = `${filename}_${count}`;
      } else {
        filenameCount.set(fullPath, 1);
      }

      // ファイル名（拡張子なし）
      const fullFilename = `${categoryPath}${filename}`;

      // ZIPにファイルを追加（カテゴリフォルダ構造を含む）
      zip.file(fullFilename, file.content);
      logger.debug('file', `Added to ZIP: ${fullFilename}`);
    }

    // ZIPファイルを生成（Uint8Arrayとして）
    const zipBlob = await zip.generateAsync({ type: 'uint8array' });

    // キャッシュディレクトリに保存
    const cacheDir = new Directory(Paths.cache);
    const timestamp = sanitizeDateForFilename(new Date().toISOString()).split('T')[0];
    const fullZipFileName = zipFileName || `noteapp-export-${timestamp}.zip`;
    const zipFile = new FSFile(cacheDir, fullZipFileName);

    // バイナリデータを書き込み
    await zipFile.write(zipBlob);

    logger.info('file', `Export ZIP file created: ${zipFile.uri}`);

    // システム共有ダイアログを表示
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(zipFile.uri, {
        mimeType: 'application/zip',
        dialogTitle: t('importExport.export.shareTitle'),
      });
      logger.info('file', `Successfully exported ${files.length} files as ZIP`);
    } else {
      Alert.alert(t('common.error'), t('importExport.export.sharingUnavailable'));
      logger.error('file', 'Sharing is not available on this device');
    }
  };

  /**
   * エクスポート機能（全ファイル）
   * 全ファイルをZIPにまとめたMarkdownファイルとしてエクスポートし、システム共有ダイアログを表示
   */
  const handleExport = useCallback(async () => {
    try {
      setIsProcessing(true);
      logger.info('file', 'Starting export process');

      // 全ファイルを取得
      const files = await FileRepository.getAll();

      // 共通処理を使用してエクスポート
      const timestamp = sanitizeDateForFilename(new Date().toISOString()).split('T')[0];
      await exportFilesToZip(files, `noteapp-export-${timestamp}.zip`);
    } catch (error: any) {
      logger.error('file', `Export failed: ${error.message}`, error);
      Alert.alert(t('common.error'), t('importExport.export.failed'));
    } finally {
      setIsProcessing(false);
    }
  }, [t]);

  /**
   * ZIPファイルからインポート
   */
  const importFromZip = async (fileUri: string, existingTitles: Set<string>) => {
    const fsFile = new FSFile(fileUri);
    const zipBytes = await fsFile.bytes();

    // ZIPを展開
    const zip = await JSZip.loadAsync(zipBytes);

    let successCount = 0;
    let errorCount = 0;

    // ZIP内の全ファイルを処理
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      // ディレクトリはスキップ
      if (zipEntry.dir) continue;

      try {
        // ファイル内容を取得（生テキスト）
        const content = await zipEntry.async('text');

        // ファイルパスからカテゴリとタイトルを抽出
        const pathParts = filename.split('/');
        let title = pathParts[pathParts.length - 1]; // 最後の部分がファイル名
        let category = '';

        // パスに階層がある場合、最後以外をカテゴリとして扱う
        if (pathParts.length > 1) {
          category = pathParts.slice(0, -1).join('/');
        }

        // タイトルの重複チェック（カテゴリを考慮したユニークキーで管理）
        const uniqueKey = generateUniqueKey(category, title);
        let finalTitle = title;
        if (existingTitles.has(uniqueKey)) {
          finalTitle = resolveDuplicateTitle(title, existingTitles);
        }

        // 新規ファイル作成（カテゴリ構造を保持）
        const createData: CreateFileDataFlat = {
          title: finalTitle,
          content: content,
          category: category,
          tags: [],
        };

        await FileRepository.create(createData);
        existingTitles.add(generateUniqueKey(category, finalTitle));
        successCount++;
        logger.debug('file', `Imported from ZIP: ${category ? category + '/' : ''}${finalTitle}`);
      } catch (error: any) {
        logger.error('file', `Failed to import ${filename}: ${error.message}`, error);
        errorCount++;
      }
    }

    return { successCount, errorCount };
  };

  /**
   * JSONファイルからインポート
   */
  const importFromJson = async (fileUri: string, existingTitles: Set<string>) => {
    const fsFile = new FSFile(fileUri);
    const fileContent = await fsFile.text();

    // JSONをパース
    let importData: ImportFileData[];
    try {
      importData = JSON.parse(fileContent);
    } catch (parseError: any) {
      logger.error('file', `JSON parse error: ${parseError.message}`, parseError);
      throw new Error(t('importExport.import.failed'));
    }

    if (!Array.isArray(importData)) {
      throw new Error(t('importExport.import.failed'));
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of importData) {
      try {
        // 必須フィールドのチェック
        if (!item.title || item.content === undefined) {
          logger.warn('file', `Skipping invalid item: ${JSON.stringify(item)}`);
          errorCount++;
          continue;
        }

        // カテゴリを取得（JSONにカテゴリ情報があれば使用）
        const category = item.category || '';
        const uniqueKey = generateUniqueKey(category, item.title);

        let finalTitle = item.title;
        if (existingTitles.has(uniqueKey)) {
          finalTitle = resolveDuplicateTitle(item.title, existingTitles);
        }

        // 新規ファイル作成
        const createData: CreateFileDataFlat = {
          title: finalTitle,
          content: item.content,
          category: category,
          tags: Array.isArray(item.tags) ? item.tags : [],
        };

        await FileRepository.create(createData);
        existingTitles.add(generateUniqueKey(category, finalTitle));
        successCount++;
        logger.debug('file', `Imported from JSON: ${category ? category + '/' : ''}${finalTitle}`);
      } catch (error: any) {
        logger.error('file', `Failed to import item: ${error.message}`, error);
        errorCount++;
      }
    }

    return { successCount, errorCount };
  };

  /**
   * 単一テキストファイルからインポート（.md, .txt, .html など）
   */
  const importFromTextFile = async (fileUri: string, filename: string, existingTitles: Set<string>) => {
    const fsFile = new FSFile(fileUri);
    const content = await fsFile.text();

    // 未分類カテゴリとして扱う
    const category = '';
    const uniqueKey = generateUniqueKey(category, filename);

    let finalTitle = filename;
    if (existingTitles.has(uniqueKey)) {
      finalTitle = resolveDuplicateTitle(filename, existingTitles);
    }

    // 新規ファイル作成（内容は一切変換しない）
    const createData: CreateFileDataFlat = {
      title: finalTitle,
      content: content,
      category: category,
      tags: [],
    };

    await FileRepository.create(createData);
    existingTitles.add(generateUniqueKey(category, finalTitle));
    logger.debug('file', `Imported text file: ${finalTitle}`);

    return { successCount: 1, errorCount: 0 };
  };

  /**
   * インポート機能
   * ZIP、JSON、テキストファイル（.md, .txt, .html など）に対応
   */
  const handleImport = useCallback(async () => {
    try {
      setIsProcessing(true);
      logger.info('file', 'Starting import process');

      // ファイルピッカーを開く（全てのファイルタイプを許可）
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        logger.info('file', 'Import canceled by user');
        return;
      }

      const pickedFile = result.assets[0];
      logger.info('file', `Selected file: ${pickedFile.name}, mimeType: ${pickedFile.mimeType}`);

      // 既存のファイル名を取得（重複チェック用）
      // カテゴリとタイトルの組み合わせをユニークキーとして管理
      const existingFiles = await FileRepository.getAll();
      const existingTitles = getExistingTitlesSet(existingFiles);

      let result_stats: { successCount: number; errorCount: number };

      // ファイルタイプに応じた処理
      if (pickedFile.name.endsWith('.zip') || pickedFile.mimeType === 'application/zip') {
        // ZIPファイル
        logger.info('file', 'Importing from ZIP file');
        result_stats = await importFromZip(pickedFile.uri, existingTitles);
      } else if (pickedFile.name.endsWith('.json') || pickedFile.mimeType === 'application/json') {
        // JSONファイル
        logger.info('file', 'Importing from JSON file');
        result_stats = await importFromJson(pickedFile.uri, existingTitles);
      } else {
        // その他のテキストファイル（.md, .txt, .html など）
        logger.info('file', 'Importing as text file');
        result_stats = await importFromTextFile(pickedFile.uri, pickedFile.name, existingTitles);
      }

      // 結果を表示
      if (result_stats.successCount > 0) {
        Alert.alert(
          t('importExport.import.completed'),
          `${result_stats.successCount}件のファイルをインポートしました${result_stats.errorCount > 0 ? `\n（${result_stats.errorCount}件失敗）` : ''}`
        );
        logger.info('file', `Import completed: ${result_stats.successCount} success, ${result_stats.errorCount} errors`);
      } else {
        Alert.alert(t('common.error'), t('importExport.import.failed'));
      }
    } catch (error: any) {
      logger.error('file', `Import failed: ${error.message}`, error);
      Alert.alert(t('common.error'), error.message || t('importExport.import.failed'));
    } finally {
      setIsProcessing(false);
    }
  }, [t]);

  /**
   * 単一ファイルのエクスポート機能
   * 指定されたファイルをZIPとしてエクスポート
   */
  const handleExportFile = useCallback(async (fileId: string) => {
    try {
      setIsProcessing(true);
      logger.info('file', `Starting export for file: ${fileId}`);

      // 指定されたファイルを取得
      const file = await FileRepository.getById(fileId);
      if (!file) {
        Alert.alert(t('common.error'), t('importExport.error.fileNotFound'));
        return;
      }

      // ファイル名をサニタイズしてZIPファイル名を作成
      const safeFileName = sanitizeFilename(file.title);
      const timestamp = sanitizeDateForFilename(new Date().toISOString()).split('T')[0];
      const zipFileName = `${safeFileName}-${timestamp}.zip`;

      // 共通処理を使用してエクスポート
      await exportFilesToZip([file], zipFileName);
    } catch (error: any) {
      logger.error('file', `Export file failed: ${error.message}`, error);
      Alert.alert(t('common.error'), t('importExport.export.fileFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [t]);

  /**
   * カテゴリーのエクスポート機能
   * 指定されたカテゴリー（サブカテゴリーを含む）のファイルをZIPとしてエクスポート
   */
  const handleExportCategory = useCallback(async (categoryPath: string) => {
    try {
      setIsProcessing(true);
      logger.info('file', `Starting export for category: ${categoryPath}`);

      // 全ファイルを取得
      const allFiles = await FileRepository.getAll();

      // 指定されたカテゴリーとそのサブカテゴリーに属するファイルをフィルタリング
      const categoryFiles = filterFilesByCategory(allFiles, categoryPath);

      if (categoryFiles.length === 0) {
        Alert.alert(t('importExport.export.title'), t('importExport.export.noCategoryFiles'));
        return;
      }

      // カテゴリー名をサニタイズしてZIPファイル名を作成
      const categoryName = getCategoryNameFromPath(categoryPath);
      const safeCategoryName = sanitizeFilename(categoryName);
      const timestamp = sanitizeDateForFilename(new Date().toISOString()).split('T')[0];
      const zipFileName = `${safeCategoryName}-${timestamp}.zip`;

      // 共通処理を使用してエクスポート
      await exportFilesToZip(categoryFiles, zipFileName);
    } catch (error: any) {
      logger.error('file', `Export category failed: ${error.message}`, error);
      Alert.alert(t('common.error'), t('importExport.export.categoryFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [t]);

  return {
    isProcessing,
    handleExport,
    handleExportFile,
    handleExportCategory,
    handleImport,
  };
};
