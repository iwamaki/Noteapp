import { v4 as uuidv4 } from 'uuid';
import { Note, CreateNoteData } from '@shared/types/note';
import { PathService } from '../../../services/PathService';
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
  const normalizedPath = PathService.normalizePath(path);
  return notes
    .filter(note => PathService.normalizePath(note.path) === normalizedPath)
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
      // Find a unique title for the copied note
      let newTitle = `Copy of ${noteToCopy.title}`;
      let counter = 1;
      const normalizedPath = PathService.normalizePath(noteToCopy.path);

      // Check if the title already exists, and if so, add a number
      while (
        notes.some(n => PathService.normalizePath(n.path) === normalizedPath && n.title === newTitle) ||
        copiedNotes.some(n => PathService.normalizePath(n.path) === normalizedPath && n.title === newTitle)
      ) {
        newTitle = `Copy of ${noteToCopy.title} (${counter})`;
        counter++;
      }

      const newNote: Note = {
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

export const createNote = async (data: CreateNoteData): Promise<Note> => {
  const now = new Date();
  const normalizedPath = PathService.normalizePath(data.path || '/');

  const notes = await getAllNotesRaw();

  // Check for duplicate note title in the same path
  const duplicateExists = notes.some(
    note => PathService.normalizePath(note.path) === normalizedPath && note.title === data.title
  );

  if (duplicateExists) {
    throw new StorageError(
      `A note with title "${data.title}" already exists in path "${normalizedPath}"`,
      'DUPLICATE_ITEM'
    );
  }

  const newNote: Note = {
    id: uuidv4(),
    title: data.title,
    content: data.content,
    tags: data.tags || [],
    path: normalizedPath,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

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
  const newTitle = data.title ?? existingNote.title;
  const newPath = data.path ? PathService.normalizePath(data.path) : existingNote.path;

  // Check for duplicate note title in the same path (excluding the current note)
  const duplicateExists = notes.some(
    note =>
      note.id !== data.id &&
      PathService.normalizePath(note.path) === newPath &&
      note.title === newTitle
  );

  if (duplicateExists) {
    throw new StorageError(
      `A note with title "${newTitle}" already exists in path "${newPath}"`,
      'DUPLICATE_ITEM'
    );
  }

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

  const normalizedNewPath = PathService.normalizePath(newPath);
  const noteTitle = notes[noteIndex].title;

  // Check for duplicate note title in the destination path
  const duplicateExists = notes.some(
    note =>
      note.id !== noteId &&
      PathService.normalizePath(note.path) === normalizedNewPath &&
      note.title === noteTitle
  );

  if (duplicateExists) {
    throw new StorageError(
      `A note with title "${noteTitle}" already exists in path "${normalizedNewPath}"`,
      'DUPLICATE_ITEM'
    );
  }

  notes[noteIndex].path = normalizedNewPath;
  notes[noteIndex].updatedAt = new Date();
  await saveAllNotes(notes);
  return notes[noteIndex];
};
