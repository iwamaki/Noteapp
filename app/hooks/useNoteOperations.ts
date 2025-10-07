import { useCallback } from 'react';
import { Note, CreateNoteData, UpdateNoteData } from '../../shared/types/note';
import { NoteActionService } from '../services/NoteActionService';
import { commandExecutor, UpdateNoteCommand, CreateNoteCommand, DeleteNoteCommand } from '../services/commandExecutor';
import { eventBus } from '../services/eventBus';
import { NoteStorageService } from '../services/storageService';
import { DraftNote } from '../store/note/noteDraftStore';
import { noteService } from '../services/NoteService';

export const useNoteOperations = () => {
  const createNote = useCallback(async (data: CreateNoteData): Promise<Note> => {
    try {
      const command = new CreateNoteCommand(data);
      await commandExecutor.execute(command);
      const createdNote = command.getCreatedNote();
      if (!createdNote) {
        throw new Error('Created note not found after command execution.');
      }
      return createdNote;
    } catch (error) {
      console.error('Failed to create note:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'create-note' });
      throw error;
    }
  }, []);

  const updateNote = useCallback(async (noteId: string, updates: Partial<UpdateNoteData>, previousState?: Note): Promise<void> => {
    try {
      const command = new UpdateNoteCommand(noteId, updates, previousState);
      await commandExecutor.execute(command);
    } catch (error) {
      console.error('Failed to update note:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'update-note' });
      throw error;
    }
  }, []);

  const deleteNote = useCallback(async (noteId: string): Promise<void> => {
    try {
      const command = new DeleteNoteCommand(noteId);
      await commandExecutor.execute(command);
    } catch (error) {
      console.error('Failed to delete note:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'delete-note' });
      throw error;
    }
  }, []);

  const bulkDeleteNotes = useCallback(async (noteIds: string[]): Promise<void> => {
    await noteService.bulkDeleteNotes(noteIds);
  }, []);

  const bulkCopyNotes = useCallback(async (sourceIds: string[]): Promise<Note[]> => {
    return await noteService.bulkCopyNotes(sourceIds);
  }, []);

  const saveDraftNote = useCallback(async (draftNote: DraftNote, activeNoteId: string | null): Promise<Note> => {
    try {
      const savedNote = await NoteActionService.saveDraftNote(draftNote, activeNoteId);
      return savedNote;
    } catch (error) {
      console.error('Failed to save draft note:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'save-draft-note' });
      throw error;
    }
  }, []);

  const fetchNotes = useCallback(async (): Promise<Note[]> => {
    return await noteService.fetchNotes();
  }, []);

  const selectNote = useCallback(async (noteId: string | null): Promise<void> => {
    await noteService.selectNote(noteId);
  }, []);

  return {
    createNote,
    updateNote,
    deleteNote,
    bulkDeleteNotes,
    bulkCopyNotes,
    saveDraftNote,
    fetchNotes,
    selectNote,
  };
};
