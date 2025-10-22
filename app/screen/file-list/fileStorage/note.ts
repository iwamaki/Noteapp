import { v4 as uuidv4 } from 'uuid';
import { File, CreateFileData } from '@shared/types/file';
import { getAllNotesRaw, saveAllNotes, StorageError } from './storage';

export interface UpdateNoteData {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  path?: string;
}

export const getAllNotes = async (): Promise<File[]> => {
  const notes = await getAllNotesRaw();
  return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

export const getNotesByPath = async (path: string): Promise<File[]> => {
  const notes = await getAllNotesRaw();
  // パスは正規化済みと仮定して、単純な文字列比較を行う
  return notes
    .filter(note => note.path === path)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

export const deleteNotes = async (noteIds: string[]): Promise<void> => {
  let notes = await getAllNotesRaw();
  notes = notes.filter(note => !noteIds.includes(note.id));
  await saveAllNotes(notes);
};

export const copyNotes = async (sourceIds: string[]): Promise<File[]> => {
  const notes = await getAllNotesRaw();
  const copiedNotes: File[] = [];
  const now = new Date();

  for (const id of sourceIds) {
    const noteToCopy = notes.find(note => note.id === id);
    if (noteToCopy) {
      // Find a unique title for the copied note
      let newTitle = `Copy of ${noteToCopy.title}`;
      let counter = 1;

      // Check if the title already exists, and if so, add a number
      // パスは正規化済みと仮定して、単純な文字列比較を行う
      while (
        notes.some(n => n.path === noteToCopy.path && n.title === newTitle) ||
        copiedNotes.some(n => n.path === noteToCopy.path && n.title === newTitle)
      ) {
        newTitle = `Copy of ${noteToCopy.title} (${counter})`;
        counter++;
      }

      const newNote: File = {
        ...noteToCopy,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        title: newTitle,
        version: 1,
      };
      copiedNotes.push(newNote);
    }
  }

  if (copiedNotes.length > 0) {
    await saveAllNotes([...notes, ...copiedNotes]);
  }
  return copiedNotes;
};

export const createNote = async (data: CreateFileData): Promise<File> => {
  const now = new Date();
  // パスは呼び出し側で正規化済みと仮定
  // 重複チェックは呼び出し側（NoteService）が行う

  const newNote: File = {
    id: uuidv4(),
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    path: data.path || '/',
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  const notes = await getAllNotesRaw();
  notes.push(newNote);
  await saveAllNotes(notes);
  return newNote;
};

export const updateNote = async (data: UpdateNoteData): Promise<File> => {
  const notes = await getAllNotesRaw();
  const noteIndex = notes.findIndex(n => n.id === data.id);

  if (noteIndex === -1) {
    throw new StorageError(`Note with id ${data.id} not found`, 'NOT_FOUND');
  }

  const existingNote = notes[noteIndex];
  // 重複チェックは呼び出し側（NoteService）が行う

  const updatedNote = {
    ...existingNote,
    ...data,
    updatedAt: new Date(),
  };
  notes[noteIndex] = updatedNote;
  await saveAllNotes(notes);
  return updatedNote;
};

export const moveNote = async (noteId: string, newPath: string): Promise<File> => {
  const notes = await getAllNotesRaw();
  const noteIndex = notes.findIndex(n => n.id === noteId);

  if (noteIndex === -1) {
    throw new StorageError(`Note with id ${noteId} not found`, 'NOT_FOUND');
  }

  // パスは呼び出し側で正規化済みと仮定
  // 重複チェックは呼び出し側（NoteService）が行う

  notes[noteIndex].path = newPath;
  notes[noteIndex].updatedAt = new Date();
  await saveAllNotes(notes);
  return notes[noteIndex];
};
