import { v4 as uuidv4 } from 'uuid';
import { Note, CreateNoteData } from '@shared/types/note';
import { PathUtils } from '../utils/pathUtils';
import { getAllNotesRaw, saveAllNotes, StorageError } from './storage';

export interface UpdateNoteData {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  path?: string;
}

export const getAllNotes = async (): Promise<Note[]> => {
  const notes = await getAllNotesRaw();
  return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

export const getNotesByPath = async (path: string): Promise<Note[]> => {
  const notes = await getAllNotesRaw();
  const normalizedPath = PathUtils.normalizePath(path);
  return notes
    .filter(note => PathUtils.normalizePath(note.path) === normalizedPath)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

export const deleteNotes = async (noteIds: string[]): Promise<void> => {
  let notes = await getAllNotesRaw();
  notes = notes.filter(note => !noteIds.includes(note.id));
  await saveAllNotes(notes);
};

export const copyNotes = async (sourceIds: string[]): Promise<Note[]> => {
  const notes = await getAllNotesRaw();
  const copiedNotes: Note[] = [];
  const now = new Date();

  for (const id of sourceIds) {
    const noteToCopy = notes.find(note => note.id === id);
    if (noteToCopy) {
      const newNote: Note = {
        ...noteToCopy,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        title: `Copy of ${noteToCopy.title}`,
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

export const createNote = async (data: CreateNoteData): Promise<Note> => {
  const now = new Date();
  const newNote: Note = {
    id: uuidv4(),
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    path: PathUtils.normalizePath(data.path || '/'),
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  const notes = await getAllNotesRaw();
  notes.push(newNote);
  await saveAllNotes(notes);
  return newNote;
};

export const updateNote = async (data: UpdateNoteData): Promise<Note> => {
  const notes = await getAllNotesRaw();
  const noteIndex = notes.findIndex(n => n.id === data.id);

  if (noteIndex === -1) {
    throw new StorageError(`Note with id ${data.id} not found`, 'NOT_FOUND');
  }

  const existingNote = notes[noteIndex];
  const updatedNote = {
    ...existingNote,
    ...data,
    updatedAt: new Date(),
  };
  notes[noteIndex] = updatedNote;
  await saveAllNotes(notes);
  return updatedNote;
};

export const moveNote = async (noteId: string, newPath: string): Promise<Note> => {
  const notes = await getAllNotesRaw();
  const noteIndex = notes.findIndex(n => n.id === noteId);

  if (noteIndex === -1) {
    throw new StorageError(`Note with id ${noteId} not found`, 'NOT_FOUND');
  }

  notes[noteIndex].path = PathUtils.normalizePath(newPath);
  notes[noteIndex].updatedAt = new Date();
  await saveAllNotes(notes);
  return notes[noteIndex];
};
