# デバッグユーティリティの復元

## 概要
フラット構造への移行（Phase 4）により、データ整合性チェック機能が一時的に無効化されました。
この機能を新しいFileRepositoryFlatを使用して再実装する必要があります。

## 影響を受けるファイル

### 部分的に無効化されたファイル
- `app/utils/debugUtils.ts`
  - `checkTreeConsistency()` - 無効化（階層構造用）
  - `logStorageState()` - 無効化（V2リポジトリ依存）

## 必要な作業

### 1. checkTreeConsistencyの再設計
階層構造（ツリー）からフラット構造へ変更に伴い、関数名と実装を見直す:

- [ ] 関数名を `checkFlatListConsistency` に変更
- [ ] パラメータをTreeNode[]からFileFlat[]に変更
- [ ] 実装の更新
  ```typescript
  export const checkFlatListConsistency = async (files: FileFlat[]): Promise<void> => {
    try {
      // ストレージから全ファイルを取得
      const allFiles = await FileRepositoryFlat.getAll();

      // UIとストレージのファイル数を比較
      if (allFiles.length !== files.length) {
        // エラー処理...
      }

      // ファイルIDの整合性をチェック
      const storageIds = new Set(allFiles.map(f => f.id));
      const uiIds = new Set(files.map(f => f.id));

      for (const id of storageIds) {
        if (!uiIds.has(id)) {
          // エラー処理...
        }
      }

      logger.debug('system', '✅ Data consistency check passed.');
    } catch (error) {
      logger.error('system', '❌ DATA INCONSISTENCY DETECTED', error);
      throw error;
    }
  };
  ```

### 2. logStorageStateの再実装
- [ ] FileRepositoryV2からFileRepositoryFlatへの移行
- [ ] フォルダ情報の削除（フラット構造にはフォルダがない）
- [ ] 実装の更新
  ```typescript
  export const logStorageState = async (): Promise<void> => {
    try {
      const allFiles = await FileRepositoryFlat.getAll();

      console.log('📦 Current Storage State:');
      console.log(`  Files: ${allFiles.length}`);

      if (allFiles.length > 0) {
        console.log('  File list:');
        allFiles.forEach(f => {
          console.log(`    - ${f.title} (id: ${f.id})`);
          if (f.categories.length > 0) {
            console.log(`      Categories: ${f.categories.join(', ')}`);
          }
          if (f.tags.length > 0) {
            console.log(`      Tags: ${f.tags.join(', ')}`);
          }
        });
      }
    } catch (error) {
      logger.error('system', 'Failed to log storage state:', error);
    }
  };
  ```

### 3. FlatListContextでの使用
- [ ] FileListScreenFlatで整合性チェックを呼び出す（開発モードのみ）
  ```typescript
  useEffect(() => {
    if (__DEV__) {
      checkFlatListConsistency(state.files).catch(error => {
        logger.error('file', 'Consistency check failed:', error);
      });
    }
  }, [state.files]);
  ```

## テスト項目
- [ ] ストレージとUIのファイル数が一致することを確認
- [ ] ストレージとUIのファイルIDが一致することを確認
- [ ] 不整合があった場合、適切なエラーが表示される
- [ ] logStorageStateで全ファイル情報が正しく表示される
- [ ] 開発モードでのみ整合性チェックが実行される

## 優先度
Low - 開発時のデバッグ機能であり、本番機能には影響しない

## 参考
- 旧実装: `app/utils/debugUtils.ts`（コメントアウトされた実装を参照）
- 階層構造版では、collectAllNodes関数を使って再帰的にノードを収集していた
- フラット構造では、すでにフラットなので再帰処理は不要
