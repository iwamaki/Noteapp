/**
 * @file useImportExport.tsx
 * @summary インポート/エクスポート機能を提供するフック
 * @description
 * ファイルのインポート（JSONファイルから読み込み）とエクスポート（ZIPにまとめたMarkdownファイル）を行う。
 * エクスポート時はシステム共有ダイアログを表示し、インポート時は未分類として新規ファイルを作成する。
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Paths, Directory, File as FSFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import { FileRepository } from '@data/repositories/fileRepository';
import { CreateFileDataFlat } from '@data/core/typesFlat';
import { logger } from '../../../utils/logger';

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
export const useImportExport = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * ファイル名をサニタイズ（不正な文字を除去）
   */
  const sanitizeFilename = (filename: string): string => {
    // ファイルシステムで使用できない文字を置換
    return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
  };

  /**
   * エクスポート機能
   * 全ファイルをZIPにまとめたMarkdownファイルとしてエクスポートし、システム共有ダイアログを表示
   */
  const handleExport = useCallback(async () => {
    try {
      setIsProcessing(true);
      logger.info('file', 'Starting export process');

      // 全ファイルを取得
      const files = await FileRepository.getAll();

      if (files.length === 0) {
        Alert.alert('エクスポート', 'エクスポートするファイルがありません');
        return;
      }

      // ZIPファイルを作成
      const zip = new JSZip();

      // 各ファイルをMarkdownとしてZIPに追加
      const filenameCount = new Map<string, number>();

      for (const file of files) {
        // ファイル名をサニタイズ
        let filename = sanitizeFilename(file.title);

        // 重複チェック（同じファイル名の場合は番号を付ける）
        if (filenameCount.has(filename)) {
          const count = filenameCount.get(filename)! + 1;
          filenameCount.set(filename, count);
          filename = `${filename}_${count}`;
        } else {
          filenameCount.set(filename, 1);
        }

        // .md拡張子を追加
        const fullFilename = `${filename}.md`;

        // ZIPにファイルを追加
        zip.file(fullFilename, file.content);
        logger.debug('file', `Added to ZIP: ${fullFilename}`);
      }

      // ZIPファイルを生成
      const zipBlob = await zip.generateAsync({ type: 'base64' });

      // キャッシュディレクトリに保存
      const cacheDir = new Directory(Paths.cache);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const zipFileName = `noteapp-export-${timestamp}.zip`;
      const zipFile = new FSFile(cacheDir, zipFileName);

      // Base64データを書き込み
      await zipFile.write(zipBlob);

      logger.info('file', `Export ZIP file created: ${zipFile.uri}`);

      // システム共有ダイアログを表示
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(zipFile.uri, {
          mimeType: 'application/zip',
          dialogTitle: 'ノートをエクスポート',
        });
        logger.info('file', `Successfully exported ${files.length} files as ZIP`);
      } else {
        Alert.alert('エラー', '共有機能が利用できません');
        logger.error('file', 'Sharing is not available on this device');
      }
    } catch (error: any) {
      logger.error('file', `Export failed: ${error.message}`, error);
      Alert.alert('エラー', 'エクスポートに失敗しました');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * 重複タイトルの解決
   */
  const resolveDuplicateTitle = (title: string, existingTitles: Set<string>): string => {
    let finalTitle = title;
    let copyCounter = 1;
    while (existingTitles.has(finalTitle)) {
      finalTitle = `${title} (コピー${copyCounter > 1 ? copyCounter : ''})`;
      copyCounter++;
    }
    return finalTitle;
  };

  /**
   * ZIPファイルからインポート
   */
  const importFromZip = async (fileUri: string, existingTitles: Set<string>) => {
    const fsFile = new FSFile(fileUri);
    const zipBase64 = await fsFile.text();

    // ZIPを展開
    const zip = await JSZip.loadAsync(zipBase64, { base64: true });

    let successCount = 0;
    let errorCount = 0;

    // ZIP内の全ファイルを処理
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      // ディレクトリはスキップ
      if (zipEntry.dir) continue;

      try {
        // ファイル内容を取得（生テキスト）
        const content = await zipEntry.async('text');

        // ファイル名（拡張子含む）をタイトルとして使用
        let finalTitle = resolveDuplicateTitle(filename, existingTitles);

        // 新規ファイル作成
        const createData: CreateFileDataFlat = {
          title: finalTitle,
          content: content,
          category: '', // 未分類
          tags: [],
        };

        await FileRepository.create(createData);
        existingTitles.add(finalTitle);
        successCount++;
        logger.debug('file', `Imported from ZIP: ${finalTitle}`);
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
      throw new Error('無効なJSONファイルです');
    }

    if (!Array.isArray(importData)) {
      throw new Error('ファイル形式が正しくありません（配列である必要があります）');
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

        let finalTitle = resolveDuplicateTitle(item.title, existingTitles);

        // 新規ファイル作成
        const createData: CreateFileDataFlat = {
          title: finalTitle,
          content: item.content,
          category: '', // 未分類
          tags: Array.isArray(item.tags) ? item.tags : [],
        };

        await FileRepository.create(createData);
        existingTitles.add(finalTitle);
        successCount++;
        logger.debug('file', `Imported from JSON: ${finalTitle}`);
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

    // ファイル名（拡張子含む）をタイトルとして使用
    let finalTitle = resolveDuplicateTitle(filename, existingTitles);

    // 新規ファイル作成（内容は一切変換しない）
    const createData: CreateFileDataFlat = {
      title: finalTitle,
      content: content,
      category: '', // 未分類
      tags: [],
    };

    await FileRepository.create(createData);
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
      const existingFiles = await FileRepository.getAll();
      const existingTitles = new Set(existingFiles.map(f => f.title));

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
          'インポート完了',
          `${result_stats.successCount}件のファイルをインポートしました${result_stats.errorCount > 0 ? `\n（${result_stats.errorCount}件失敗）` : ''}`
        );
        logger.info('file', `Import completed: ${result_stats.successCount} success, ${result_stats.errorCount} errors`);
      } else {
        Alert.alert('エラー', 'インポートに失敗しました');
      }
    } catch (error: any) {
      logger.error('file', `Import failed: ${error.message}`, error);
      Alert.alert('エラー', error.message || 'インポートに失敗しました');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    handleExport,
    handleImport,
  };
};
