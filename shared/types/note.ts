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
}

export interface NoteVersion {
  id: string;
  noteId: string;
  content: string;
  version: number;
  createdAt: Date;
}

export interface CreateNoteData {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateNoteData {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}
