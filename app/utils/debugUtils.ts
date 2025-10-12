import { TreeNode, flattenTree } from '../screen/note-list/utils/treeUtils';
import { NoteListStorage } from '../screen/note-list/noteStorage';

/**
 * A debug utility to ensure consistency between the data in storage and the data in the UI tree.
 * This function should only be called in development mode (__DEV__ === true).
 *
 * @param treeNodes The tree structure from the UI state.
 * @throws An error if an inconsistency is detected.
 */
export const checkTreeConsistency = async (treeNodes: TreeNode[]): Promise<void> => {
  try {
    // 1. Get the source of truth from storage
    const allNotes = await NoteListStorage.getAllNotes();
    const allFolders = await NoteListStorage.getAllFolders();

    // 2. Get the UI data
    const flattenedUiTree = flattenTree(treeNodes);
    const uiNotes = flattenedUiTree.filter(node => node.type === 'note');
    const uiFolders = flattenedUiTree.filter(node => node.type === 'folder');

    // 3. Compare counts
    if (allNotes.length !== uiNotes.length) {
      throw new Error(
        `Data Inconsistency: Note count mismatch.\n` +
        `Storage: ${allNotes.length} notes, UI: ${uiNotes.length} notes.\n` +
        `Storage IDs: ${JSON.stringify(allNotes.map(n => n.id))}\n` +
        `UI IDs: ${JSON.stringify(uiNotes.map(n => n.id))}`
      );
    }

    if (allFolders.length !== uiFolders.length) {
      throw new Error(
        `Data Inconsistency: Folder count mismatch.\n` +
        `Storage: ${allFolders.length} folders, UI: ${uiFolders.length} folders.\n` +
        `Storage IDs: ${JSON.stringify(allFolders.map(f => f.id))}\n` +
        `UI IDs: ${JSON.stringify(uiFolders.map(f => f.id))}`
      );
    }

    // 4. Compare content (IDs)
    const storageNoteIds = new Set(allNotes.map(n => n.id));
    const uiNoteIds = new Set(uiNotes.map(n => n.id));
    for (const id of storageNoteIds) {
      if (!uiNoteIds.has(id)) {
        throw new Error(`Data Inconsistency: Note with ID '${id}' exists in storage but not in UI.`);
      }
    }

    const storageFolderIds = new Set(allFolders.map(f => f.id));
    const uiFolderIds = new Set(uiFolders.map(f => f.id));
    for (const id of storageFolderIds) {
      if (!uiFolderIds.has(id)) {
        throw new Error(`Data Inconsistency: Folder with ID '${id}' exists in storage but not in UI.`);
      }
    }

    console.log('Data consistency check passed.');

  } catch (error) {
    console.error('--- DATA INCONSISTENCY DETECTED ---');
    console.error(error);
    // Re-throw the error to make it visible
    throw error;
  }
};
