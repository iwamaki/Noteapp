/**
 * @file __test_fileSystemUtils.ts
 * @summary fileSystemUtilsの動作確認テスト
 * @description
 * このファイルは開発用のテストファイルです。
 * 実装後に削除またはコメントアウトしてください。
 */

import {
  initializeFileSystem,
  readFilesMetadata,
  writeFilesMetadata,
  readFileContent,
  writeFileContent,
  deleteFileContent,
  getFileSystemInfo,
  deleteFileSystem,
  FileMetadata,
} from './fileSystemUtils';

/**
 * 基本的な動作テスト
 */
export const testFileSystemUtils = async (): Promise<void> => {
  console.log('🧪 FileSystem Utils Test Started...\n');

  try {
    // テスト1: ファイルシステム初期化
    console.log('Test 1: ファイルシステムの初期化');
    await deleteFileSystem(); // クリーンスタート
    await initializeFileSystem();
    console.log('✅ 初期化成功\n');

    // テスト2: ファイルシステム情報取得
    console.log('Test 2: ファイルシステム情報取得');
    let info = await getFileSystemInfo();
    console.log('Info:', JSON.stringify(info, null, 2));
    console.log('✅ 情報取得成功\n');

    // テスト3: メタデータの書き込み
    console.log('Test 3: メタデータの書き込み');
    const testMetadata: FileMetadata[] = [
      {
        id: 'test-file-1',
        title: 'テストファイル1',
        tags: ['test', 'phase1'],
        path: '/',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'test-file-2',
        title: 'テストファイル2',
        tags: ['test'],
        path: '/folder1/',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    await writeFilesMetadata(testMetadata);
    console.log('✅ メタデータ書き込み成功\n');

    // テスト4: メタデータの読み込み
    console.log('Test 4: メタデータの読み込み');
    const loadedMetadata = await readFilesMetadata();
    console.log(`読み込んだメタデータ件数: ${loadedMetadata.length}`);
    console.log('Metadata:', JSON.stringify(loadedMetadata, null, 2));
    console.log('✅ メタデータ読み込み成功\n');

    // テスト5: コンテンツの書き込み
    console.log('Test 5: コンテンツの書き込み');
    await writeFileContent('test-file-1', 'これはテストファイル1のコンテンツです。\n複数行にわたるテキストも保存できます。');
    await writeFileContent('test-file-2', 'テストファイル2のコンテンツ');
    console.log('✅ コンテンツ書き込み成功\n');

    // テスト6: コンテンツの読み込み
    console.log('Test 6: コンテンツの読み込み');
    const content1 = await readFileContent('test-file-1');
    const content2 = await readFileContent('test-file-2');
    console.log('Content 1:', content1);
    console.log('Content 2:', content2);
    console.log('✅ コンテンツ読み込み成功\n');

    // テスト7: ファイルシステム情報の再取得
    console.log('Test 7: ファイルシステム情報の再取得');
    info = await getFileSystemInfo();
    console.log('Info:', JSON.stringify(info, null, 2));
    console.log('✅ 情報取得成功\n');

    // テスト8: コンテンツの削除
    console.log('Test 8: コンテンツの削除');
    await deleteFileContent('test-file-1');
    console.log('✅ コンテンツ削除成功\n');

    // テスト9: 削除後の読み込み（エラーになるはず）
    console.log('Test 9: 削除後の読み込み（エラーテスト）');
    try {
      await readFileContent('test-file-1');
      console.log('❌ エラーが発生すべきでした');
    } catch (error: any) {
      console.log('✅ 期待通りエラーが発生:', error.code);
    }
    console.log('');

    // テスト10: クリーンアップ
    console.log('Test 10: クリーンアップ');
    await deleteFileSystem();
    console.log('✅ クリーンアップ成功\n');

    console.log('🎉 All tests passed!\n');
  } catch (error) {
    console.error('❌ テスト失敗:', error);
    throw error;
  }
};

/**
 * メタデータとコンテンツの分離テスト
 */
export const testMetadataContentSeparation = async (): Promise<void> => {
  console.log('🧪 Metadata/Content Separation Test Started...\n');

  try {
    await deleteFileSystem();
    await initializeFileSystem();

    // 大きなコンテンツを持つファイルのメタデータ
    const largeContent = 'あ'.repeat(10000); // 10,000文字
    const metadata: FileMetadata = {
      id: 'large-file',
      title: '大きなファイル',
      tags: ['large', 'test'],
      path: '/',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // メタデータとコンテンツを別々に保存
    await writeFilesMetadata([metadata]);
    await writeFileContent('large-file', largeContent);

    // メタデータのみを読み込み（高速であるべき）
    console.time('メタデータ読み込み');
    const loadedMetadata = await readFilesMetadata();
    console.timeEnd('メタデータ読み込み');
    console.log(`メタデータサイズ: ${JSON.stringify(loadedMetadata).length} bytes`);

    // コンテンツを読み込み
    console.time('コンテンツ読み込み');
    const loadedContent = await readFileContent('large-file');
    console.timeEnd('コンテンツ読み込み');
    console.log(`コンテンツサイズ: ${loadedContent.length} bytes`);

    // 検証
    if (loadedContent.length === 10000) {
      console.log('✅ コンテンツが正しく保存・読み込みされました');
    } else {
      console.log('❌ コンテンツサイズが一致しません');
    }

    await deleteFileSystem();
    console.log('🎉 Separation test passed!\n');
  } catch (error) {
    console.error('❌ テスト失敗:', error);
    throw error;
  }
};
