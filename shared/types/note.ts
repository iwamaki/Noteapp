export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  tags?: string[];
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

export interface NoteVersion {
  id: string;
  noteId: string;
  content: string;
  version: number;
  createdAt: Date;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
}
