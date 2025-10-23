/**
 * @file file.ts
 * @summary ファイルに関する型定義
 */

export interface File {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  path: string; // フォルダパス（例: "/", "/folder1/", "/folder1/subfolder/"）
}

export interface FileVersion {
  id: string;
  fileId: string;
  content: string;
  version: number;
  createdAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  path: string; // 親フォルダのパス
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFileData {
  title: string;
  content: string;
  tags?: string[];
  path?: string; // デフォルトは "/"
}

export interface UpdateFileData {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  path?: string; // ファイルの移動に使用
}

export interface CreateFolderData {
  name: string;
  path: string; // 親フォルダのパス
}

export interface UpdateFolderData {
  id: string;
  name?: string;
  path?: string; // フォルダの移動に使用
}

export type FileSystemItem =
  | { type: 'file'; item: File }
  | { type: 'folder'; item: Folder };
