// TODO: Update for flat structure or remove
// import { TreeNode } from '../screen/file-list/utils/treeUtils';
// import { FileRepositoryV2 } from '@data/repositories/fileRepositoryV2';
// import { FolderRepositoryV2 } from '@data/repositories/folderRepositoryV2';
import { logger } from './logger';

// Placeholder types for now
type TreeNode = any;

/**
 * A debug utility to ensure consistency between the data in storage and the data in the UI tree.
 * This function should only be called in development mode (__DEV__ === true).
 *
 * V2リポジトリを使用してデータ整合性をチェックします。
 * V2型からV1型に変換して、既存のUIツリー（V1型ベース）と比較します。
 *
 * @param treeNodes The tree structure from the UI state.
 * @throws An error if an inconsistency is detected.
 */
/**
 * Recursively collects all nodes from the tree, including children of collapsed folders.
 */
const collectAllNodes = (nodes: TreeNode[]): TreeNode[] => {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children.length > 0) {
      result.push(...collectAllNodes(node.children));
    }
  }
  return result;
};

export const checkTreeConsistency = async (treeNodes: TreeNode[]): Promise<void> => {
  // TODO: Re-implement for flat structure
  logger.warn('system', 'checkTreeConsistency is disabled for flat structure migration');
  return;

  /* Old implementation - disabled
  try {

    // 1. Get the source of truth from storage
    // ルートレベルのみ取得（簡易的なデバッグ）
    // 本格的なデバッグには、再帰的に全アイテムを収集する必要があります
    const [allFiles, allFolders] = await Promise.all([
      FileRepositoryV2.getByFolderPath('/'),
      FolderRepositoryV2.getByParentPath('/'),
    ]);
  */

    /* // 2. Get the UI data - collect ALL nodes including those in collapsed folders
    const allUiNodes = collectAllNodes(treeNodes);
    const uiFiles = allUiNodes.filter(node => node.type === 'file');
    const uiFolders = allUiNodes.filter(node => node.type === 'folder');

    // 3. Compare counts
    if (allFiles.length !== uiFiles.length) {
      const storageFileIds = allFiles.map(n => n.id);
      const uiFileIds = uiFiles.map(n => n.id);
      const missingInUi = storageFileIds.filter(id => !uiFileIds.includes(id));
      const extraInUi = uiFileIds.filter(id => !storageFileIds.includes(id));

      throw new Error(
        `Data Inconsistency: File count mismatch.\n` +
        `Storage: ${allFiles.length} files, UI: ${uiFiles.length} files.\n` +
        `Missing in UI: ${JSON.stringify(missingInUi)}\n` +
        `Extra in UI: ${JSON.stringify(extraInUi)}\n` +
        `Storage files:\n${JSON.stringify(allFiles.map(n => ({ id: n.id, title: n.title })), null, 2)}`
      );
    }

    if (allFolders.length !== uiFolders.length) {
      const storageFolderIds = allFolders.map(f => f.id);
      const uiFolderIds = uiFolders.map(f => f.id);
      const missingInUi = storageFolderIds.filter(id => !uiFolderIds.includes(id));
      const extraInUi = uiFolderIds.filter(id => !storageFolderIds.includes(id));

      throw new Error(
        `Data Inconsistency: Folder count mismatch.\n` +
        `Storage: ${allFolders.length} folders, UI: ${uiFolders.length} folders.\n` +
        `Missing in UI: ${JSON.stringify(missingInUi)}\n` +
        `Extra in UI: ${JSON.stringify(extraInUi)}\n` +
        `Storage folders:\n${JSON.stringify(allFolders.map(f => ({ id: f.id, name: f.name, slug: f.slug })), null, 2)}`
      );
    }

    // 4. Compare content (IDs)
    const storageFileIds = new Set(allFiles.map(n => n.id));
    const uiFileIds = new Set(uiFiles.map(n => n.id));
    for (const id of storageFileIds) {
      if (!uiFileIds.has(id)) {
        const missingFile = allFiles.find(n => n.id === id);
        throw new Error(
          `Data Inconsistency: File with ID '${id}' exists in storage but not in UI.\n` +
          `Missing file: ${JSON.stringify(missingFile, null, 2)}`
        );
      }
    }

    const storageFolderIds = new Set(allFolders.map(f => f.id));
    const uiFolderIds = new Set(uiFolders.map(f => f.id));
    for (const id of storageFolderIds) {
      if (!uiFolderIds.has(id)) {
        const missingFolder = allFolders.find(f => f.id === id);
        throw new Error(
          `Data Inconsistency: Folder with ID '${id}' exists in storage but not in UI.\n` +
          `Missing folder: ${JSON.stringify(missingFolder, null, 2)}`
        );
      }
    }

    logger.debug('tree', '✅ Data consistency check passed.');

  } catch (error) {
    console.error('❌ DATA INCONSISTENCY DETECTED');
    console.error(error);
    // Re-throw the error to make it visible
    throw error;
  }
  */
};

/**
 * Logs the current state of storage for debugging purposes
 */
export const logStorageState = async (): Promise<void> => {
  // TODO: Re-implement for flat structure
  logger.warn('system', 'logStorageState is disabled for flat structure migration');
  return;

  /* Old implementation - disabled
  try {
    // リポジトリから取得（ルートレベルのみ）
    const [allFiles, allFolders] = await Promise.all([
      FileRepositoryV2.getByFolderPath('/'),
      FolderRepositoryV2.getByParentPath('/'),
    ]);

    console.log('📦 Current Storage State:');
    console.log(`  Files: ${allFiles.length}`);
    console.log(`  Folders: ${allFolders.length}`);

    if (allFolders.length > 0) {
      console.log('  Folder structure:');
      allFolders.forEach(f => {
        console.log(`    - ${f.name} (slug: ${f.slug}, id: ${f.id})`);
      });
    }

    if (allFiles.length > 0) {
      console.log('  File structure:');
      allFiles.forEach(n => {
        console.log(`    - ${n.title} (id: ${n.id})`);
      });
    }
  } catch (error) {
    console.error('Failed to log storage state:', error);
  }
  */
};
