import { saveNote, getNoteById, getAllNotes, deleteNoteById } from './storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-get-random-values'; // Import for uuid

describe('storageService', () => {
  // Clear mock storage before each test to ensure isolation
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('should save a new note and retrieve it by ID', async () => {
    const newNote = { title: 'Test Note', content: 'This is a test.' };
    const savedNote = await saveNote(newNote);

    // Check if it has an ID and timestamps
    expect(savedNote.id).toBeDefined();
    expect(savedNote.createdAt).toBeDefined();
    expect(savedNote.updatedAt).toBeDefined();

    const retrievedNote = await getNoteById(savedNote.id);

    // Compare all properties
    expect(retrievedNote).toEqual(savedNote);
  });

  it('should update an existing note', async () => {
    const newNote = { title: 'Original Title', content: 'Original content' };
    const savedNote = await saveNote(newNote);

    // Introduce a small delay to ensure the timestamp changes
    await new Promise(resolve => setTimeout(resolve, 10));

    const updatedNoteData = {
      id: savedNote.id,
      title: 'Updated Title',
      content: 'Updated content',
    };
    const updatedNote = await saveNote(updatedNoteData);

    expect(updatedNote.id).toBe(savedNote.id);
    expect(updatedNote.title).toBe('Updated Title');
    expect(updatedNote.createdAt).toEqual(savedNote.createdAt); // createdAt should not change
    expect(updatedNote.updatedAt).not.toEqual(savedNote.updatedAt); // updatedAt should have changed

    const retrievedNote = await getNoteById(savedNote.id);
    expect(retrievedNote).toEqual(updatedNote);
  });

  it('should retrieve all notes, sorted by updatedAt descending', async () => {
    await saveNote({ title: 'Note 1', content: 'Content 1' });
    // Ensure timestamps are different for sorting
    await new Promise(resolve => setTimeout(resolve, 10));
    await saveNote({ title: 'Note 2', content: 'Content 2' });

    const allNotes = await getAllNotes();
    expect(allNotes.length).toBe(2);
    expect(allNotes[0].title).toBe('Note 2'); // Note 2 was saved last
    expect(allNotes[1].title).toBe('Note 1');
  });

  it('should delete a note by ID', async () => {
    const note1 = await saveNote({ title: 'Note 1', content: 'Content 1' });
    await saveNote({ title: 'Note 2', content: 'Content 2' });

    await deleteNoteById(note1.id);

    const allNotes = await getAllNotes();
    expect(allNotes.length).toBe(1);
    expect(allNotes[0].title).toBe('Note 2');

    const deletedNote = await getNoteById(note1.id);
    expect(deletedNote).toBeNull();
  });

  it('should return null for a non-existent note ID', async () => {
    const nonExistentNote = await getNoteById('non-existent-id');
    expect(nonExistentNote).toBeNull();
  });
});
