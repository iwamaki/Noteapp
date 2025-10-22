import { TreeNode } from '../screen/file-list/utils/treeUtils';
import { FileListStorage } from '../screen/file-list/fileStorage';
import { logger } from './logger';

/**
 * A debug utility to ensure consistency between the data in storage and the data in the UI tree.
 * This function should only be called in development mode (__DEV__ === true).
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
  try {

    // 1. Get the source of truth from storage
    const allFiles = await FileListStorage.getAllFiles();      
    const allFolders = await FileListStorage.getAllFolders();

    // 2. Get the UI data - collect ALL nodes including those in collapsed folders
    const allUiNodes = collectAllNodes(treeNodes);
    const uiNotes = allUiNodes.filter(node => node.type === 'file');
    const uiFolders = allUiNodes.filter(node => node.type === 'folder');

    // 3. Compare counts
    if (allFiles.length !== uiNotes.length) {
      const storageNoteIds = allFiles.map(n => n.id);
      const uiNoteIds = uiNotes.map(n => n.id);
      const missingInUi = storageNoteIds.filter(id => !uiNoteIds.includes(id));
      const extraInUi = uiNoteIds.filter(id => !storageNoteIds.includes(id));

      throw new Error(
        `Data Inconsistency: File count mismatch.\n` +
        `Storage: ${allFiles.length} notes, UI: ${uiNotes.length} notes.\n` +
        `Missing in UI: ${JSON.stringify(missingInUi)}\n` +
        `Extra in UI: ${JSON.stringify(extraInUi)}\n` +
        `Storage files:\n${JSON.stringify(allFiles.map(n => ({ id: n.id, title: n.title, path: n.path })), null, 2)}`
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
        `Storage folders:\n${JSON.stringify(allFolders.map(f => ({ id: f.id, name: f.name, path: f.path })), null, 2)}`
      );
    }

    // 4. Compare content (IDs)
    const storageNoteIds = new Set(allFiles.map(n => n.id));
    const uiNoteIds = new Set(uiNotes.map(n => n.id));
    for (const id of storageNoteIds) {
      if (!uiNoteIds.has(id)) {
        const missingNote = allFiles.find(n => n.id === id);
        throw new Error(
          `Data Inconsistency: Note with ID '${id}' exists in storage but not in UI.\n` +
          `Missing file: ${JSON.stringify(missingNote, null, 2)}`
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
};

/**
 * Logs the current state of storage for debugging purposes
 */
export const logStorageState = async (): Promise<void> => {
  try {
    const allFiles = await FileListStorage.getAllFiles();
    const allFolders = await FileListStorage.getAllFolders();

    console.log('📦 Current Storage State:');
    console.log(`  Notes: ${allFiles.length}`);
    console.log(`  Folders: ${allFolders.length}`);

    if (allFolders.length > 0) {
      console.log('  Folder structure:');
      allFolders.forEach(f => {
        console.log(`    - ${f.name} (path: ${f.path}, id: ${f.id})`);
      });
    }

    if (allFiles.length > 0) {
      console.log('  File structure:');
      allFiles.forEach(n => {
        console.log(`    - ${n.title} (path: ${n.path}, id: ${n.id})`);
      });
    }
  } catch (error) {
    console.error('Failed to log storage state:', error);
  }
};
