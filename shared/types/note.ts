/**
 * @file note.ts
 * @summary ノートに関する型定義
 */

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  path: string; // フォルダパス（例: "/", "/folder1/", "/folder1/subfolder/"）
}

export interface NoteVersion {
  id: string;
  noteId: string;
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

export interface CreateNoteData {
  title: string;
  content: string;
  tags?: string[];
  path?: string; // デフォルトは "/"
}

export interface UpdateNoteData {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  path?: string; // ノートの移動に使用
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
  | { type: 'note'; item: Note }
  | { type: 'folder'; item: Folder };
