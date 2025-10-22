/**
 * @file NoteListUseCases.ts
 * @summary ノートリスト画面のユースケース層
 * @description
 * Domain層とInfrastructure層を組み合わせて、
 * 実際のビジネスユースケースを実装します。
 */

import { File, Folder, CreateFileData, CreateFolderData } from '@shared/types/file';
import { FileRepository } from '../infrastructure/FileRepository';
import { FolderRepository } from '../infrastructure/FolderRepository';
import { FileDomainService } from '../domain/FileDomainService';
import { FolderDomainService } from '../domain/FolderDomainService';
import { PathService } from '../../../services/PathService';

/**
 * ノートリストユースケース
 * 複雑なビジネスロジックを含む操作を提供
 */
export class FileListUseCases {
  /**
   * 選択されたアイテムを削除
   * @param noteIds 削除するノートIDの配列
   * @param folderIds 削除するフォルダIDの配列
   * @description
   * フォルダを削除する場合、その子孫フォルダと含まれる全ノートも削除します。
   */
  static async deleteSelectedItems(
    fileIds: string[],
    folderIds: string[]
  ): Promise<void> {
    // 1. フォルダの子孫を全て取得
    const allFolders = await FolderRepository.getAll();
    const allNotes = await FileRepository.getAll();

    const foldersToDelete = new Set<string>(folderIds);

    // 各フォルダの子孫フォルダをすべて追加
    for (const folderId of folderIds) {
      const folder = allFolders.find(f => f.id === folderId);
      if (!folder) continue;

      const folderFullPath = FolderDomainService.getFullPath(folder);
      const descendants = FolderDomainService.getAllDescendantFolders(
        folderFullPath,
        allFolders
      );
      descendants.forEach(d => foldersToDelete.add(d.id));
    }

    // 2. フォルダ内のノートを全て取得
    const filesToDelete = new Set<string>(fileIds);

    for (const folderId of foldersToDelete) {
      const folder = allFolders.find(f => f.id === folderId);
      if (!folder) continue;

      const folderFullPath = FolderDomainService.getFullPath(folder);
      const childNotes = FolderDomainService.getChildNotes(folderFullPath, allNotes);
      childNotes.forEach(n => filesToDelete.add(n.id));
    }

    // 3. 一括削除（トランザクション的に実行）
    await Promise.all([
      FileRepository.batchDelete(Array.from(filesToDelete)),
      FolderRepository.batchDelete(Array.from(foldersToDelete)),
    ]);
  }

  /**
   * フォルダをリネーム（子要素のパスも更新）
   * @param folderId フォルダID
   * @param newName 新しいフォルダ名
   * @throws バリデーションエラー、重複エラー
   */
  static async renameFolder(folderId: string, newName: string): Promise<void> {
    // 1. バリデーション
    const validation = FolderDomainService.validateFolderName(newName);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. フォルダを取得
    const allFolders = await FolderRepository.getAll();
    const folder = allFolders.find(f => f.id === folderId);
    if (!folder) {
      throw new Error('フォルダが見つかりません');
    }

    // 3. 新しいパスを生成
    const newFullPath = PathService.getFullPath(folder.path, newName, 'folder');

    // 4. 重複チェック
    const { isDuplicate } = await FolderDomainService.checkDuplicate(
      newName,
      folder.path,
      folderId
    );
    if (isDuplicate) {
      throw new Error('同じ名前のフォルダが既に存在します');
    }

    // 5. 子フォルダと子ノートのパスを更新
    const oldFullPath = FolderDomainService.getFullPath(folder);
    const descendants = FolderDomainService.getAllDescendantFolders(oldFullPath, allFolders);

    const allNotes = await FileRepository.getAll();
    const allChildNotes = FolderDomainService.getAllDescendantNotes(
      oldFullPath,
      allNotes,
      allFolders
    );

    // 6. フォルダ自身を更新
    const updatedFolder: Folder = {
      ...folder,
      name: newName,
      updatedAt: new Date(),
    };

    // 7. 子孫フォルダのパスを更新
    const updatedDescendantFolders = descendants.map(d => {
      const descendantFullPath = FolderDomainService.getFullPath(d);
      const newDescendantPath = descendantFullPath.replace(oldFullPath, newFullPath);
      const newParentPath = PathService.getParentPath(newDescendantPath);

      return {
        ...d,
        path: newParentPath,
        updatedAt: new Date(),
      };
    });

    // 8. 子孫ノートのパスを更新
    const updatedNotes = allChildNotes.map(note => ({
      ...note,
      path: note.path.replace(oldFullPath, newFullPath),
      updatedAt: new Date(),
    }));

    // 9. 一括更新（トランザクション的に実行）
    await Promise.all([
      FolderRepository.batchUpdate([updatedFolder, ...updatedDescendantFolders]),
      FileRepository.batchUpdate(updatedNotes),
    ]);

    // 10. AsyncStorageの書き込み完了を待機
    // この後、呼び出し側で refreshData() を実行することで、
    // 確実に最新データを取得できる
  }

  /**
   * ノートをリネーム
   * @param fileId ファイルID
   * @param newTitle 新しいタイトル
   * @throws バリデーションエラー、重複エラー
   */
  static async renameFile(fileId: string, newTitle: string): Promise<void> {
    // 1. バリデーション
    const validation = FileDomainService.validateFileName(newTitle);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. ノートを取得
    const file = await FileRepository.getById(fileId);
    if (!file) {
      throw new Error('ノートが見つかりません');
    }

    // 3. 重複チェック
    const { isDuplicate } = await FileDomainService.checkDuplicate(
      newTitle,
      file.path,
      fileId
    );
    if (isDuplicate) {
      throw new Error('同じ名前のノートが既に存在します');
    }

    // 4. 更新
    const updatedFile: File = {
      ...file,
      id: file.id,
      title: newTitle,
      updatedAt: new Date(),
    };

    await FileRepository.update(updatedFile);
  }

  /**
   * 選択されたアイテムを移動
   * @param fileIds 移動するファイルIDの配列
   * @param folderIds 移動するフォルダIDの配列
   * @param targetFolderPath 移動先フォルダパス
   * @throws バリデーションエラー、重複エラー
   */
  static async moveSelectedItems(
    fileIds: string[],
    folderIds: string[],
    targetFolderPath: string
  ): Promise<void> {
    const normalizedTargetPath = PathService.normalizePath(targetFolderPath);

    // 1. ノートの移動バリデーション
    const fileValidation = await FileDomainService.validateMoveOperation(
      fileIds,
      normalizedTargetPath
    );
    if (!fileValidation.valid) {
      throw new Error(fileValidation.errors.join('\n'));
    }

    // 2. ノートを移動
    const allFiles = await FileRepository.getAll();
    const updatedFiles = fileIds
      .map(fileId => {
        const file = allFiles.find(n => n.id === fileId);
        if (!file) return null;
        return {
          ...file,
          path: normalizedTargetPath,
          updatedAt: new Date(),
        };
      })
      .filter((f): f is File => f !== null);

    // 3. フォルダを移動
    const allFolders = await FolderRepository.getAll();
    const foldersToUpdate: Folder[] = [];
    const filesInFolders: File[] = [];

    for (const folderId of folderIds) {
      const folder = allFolders.find(f => f.id === folderId);
      if (!folder) continue;

      // 移動先バリデーション
      const folderValidation = await FolderDomainService.validateMoveOperation(
        folderId,
        normalizedTargetPath,
        allFolders
      );
      if (!folderValidation.valid) {
        throw new Error(folderValidation.error);
      }

      const oldFullPath = FolderDomainService.getFullPath(folder);
      const newFullPath = PathService.getFullPath(normalizedTargetPath, folder.name, 'folder');

      // フォルダ自身を更新
      foldersToUpdate.push({
        ...folder,
        path: normalizedTargetPath,
        updatedAt: new Date(),
      });

      // 子孫フォルダも移動
      const descendants = FolderDomainService.getAllDescendantFolders(oldFullPath, allFolders);
      foldersToUpdate.push(
        ...descendants.map(d => {
          const descendantFullPath = FolderDomainService.getFullPath(d);
          const newDescendantPath = descendantFullPath.replace(oldFullPath, newFullPath);
          const newParentPath = PathService.getParentPath(newDescendantPath);

          return {
            ...d,
            path: newParentPath,
            updatedAt: new Date(),
          };
        })
      );

      // フォルダ内のノートも移動
      const childNotes = FolderDomainService.getAllDescendantNotes(
        oldFullPath,
        allFiles,
        allFolders
      );
      filesInFolders.push(
        ...childNotes.map(n => ({
          ...n,
          path: n.path.replace(oldFullPath, newFullPath),
          updatedAt: new Date(),
        }))
      );
    }

    // 4. 一括更新
    await Promise.all([
      FileRepository.batchUpdate([...updatedFiles, ...filesInFolders]),
      FolderRepository.batchUpdate(foldersToUpdate),
    ]);
  }

  /**
   * パス指定でファイルを作成
   * @param inputPath パス文字列（例: "folder1/folder2/note title"）
   * @param content ノート内容
   * @param tags タグ
   * @returns 作成されたノート
   * @description
   * パス内のフォルダが存在しない場合は自動的に作成します。
   */
  static async createFileWithPath(
    inputPath: string,
    content: string = '',
    tags: string[] = []
  ): Promise<File> {
    // 1. パスをパース
    const { folders, fileName } = PathService.parseInputPath(inputPath);

    // 2. タイトルのバリデーション
    const validation = FileDomainService.validateFileName(fileName);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 3. フォルダの存在を確認し、必要なら作成
    let currentPath = '/';
    const allFolders = await FolderRepository.getAll();

    for (const folderName of folders) {
      const folderValidation = FolderDomainService.validateFolderName(folderName);
      if (!folderValidation.valid) {
        throw new Error(folderValidation.error);
      }

      const existingFolder = allFolders.find(f => {
        const fullPath = FolderDomainService.getFullPath(f);
        const targetPath = PathService.getFullPath(currentPath, folderName, 'folder');
        return fullPath === targetPath;
      });

      if (!existingFolder) {
        // フォルダを作成
        const newFolder = await FolderRepository.create({
          name: folderName,
          path: currentPath,
        });
        allFolders.push(newFolder);
        currentPath = FolderDomainService.getFullPath(newFolder);
      } else {
        currentPath = FolderDomainService.getFullPath(existingFolder);
      }
    }

    // 4. 重複チェック
    const { isDuplicate } = await FileDomainService.checkDuplicate(
      fileName,
      currentPath
    );
    if (isDuplicate) {
      throw new Error(`"${fileName}" は既に存在します`);
    }

    // 5. ノートを作成
    const fileData: CreateFileData = {
      title: fileName,
      content,
      tags,
      path: currentPath,
    };

    return await FileRepository.create(fileData);
  }

  /**
   * フォルダを作成
   * @param name フォルダ名
   * @param parentPath 親フォルダパス
   * @returns 作成されたフォルダ
   * @throws バリデーションエラー、重複エラー
   */
  static async createFolder(name: string, parentPath: string): Promise<Folder> {
    // 1. バリデーション
    const validation = FolderDomainService.validateFolderName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. 重複チェック
    const { isDuplicate } = await FolderDomainService.checkDuplicate(name, parentPath);
    if (isDuplicate) {
      throw new Error('同じ名前のフォルダが既に存在します');
    }

    // 3. 作成
    const folderData: CreateFolderData = {
      name,
      path: PathService.normalizePath(parentPath),
    };

    return await FolderRepository.create(folderData);
  }

  /**
   * ノートをコピー
   * @param fileIds コピーするファイルIDの配列
   * @returns コピーされたノートの配列
   */
  static async copyFiles(fileIds: string[]): Promise<File[]> {
    // バリデーション
    const validation = await FileDomainService.validateCopyOperation(fileIds);
    if (!validation.valid) {
      throw new Error(validation.errors.join('\n'));
    }

    return await FileRepository.copy(fileIds);
  }

  /**
   * アイテムの存在チェック
   * @param fileIds ファイルIDの配列
   * @param folderIds フォルダIDの配列
   * @returns 全て存在する場合true
   */
  static async validateItemsExist(
    fileIds: string[],
    folderIds: string[]
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const allNotes = await FileRepository.getAll();
    const allFolders = await FolderRepository.getAll();

    for (const fileId of fileIds) {
      if (!allNotes.find(n => n.id === fileId)) {
        errors.push(`ファイル ${fileId} が見つかりません`);
      }
    }

    for (const folderId of folderIds) {
      if (!allFolders.find(f => f.id === folderId)) {
        errors.push(`フォルダ ${folderId} が見つかりません`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
