import { useEffect, useCallback, useState } from 'react';
import { useNavigation, NavigationProp, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { Note } from '@shared/types/note';
import { NoteListStorage } from '../noteStorage'; // Import the new NoteListStorage
import { logger } from '../../../utils/logger';

export const useNoteListLogic = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  // State management using useState
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  // Function to fetch notes
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedNotes = await NoteListStorage.getAllNotes();
      setNotes(fetchedNotes);
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch notes on screen focus
  useEffect(() => {
    if (isFocused) {
      fetchNotes();
    }
  }, [isFocused, fetchNotes]);

  // Debug log
  logger.debug('note', 'useNoteListLogic render:', { isSelectionMode, selectedCount: selectedNoteIds.size });

  // Note selection handler
  const handleSelectNote = useCallback((noteId: string) => {
    if (isSelectionMode) {
      setSelectedNoteIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(noteId)) {
          newSet.delete(noteId);
        } else {
          newSet.add(noteId);
        }
        return newSet;
      });
    } else {
      navigation.navigate('NoteEdit', { noteId });
    }
  }, [isSelectionMode, navigation]);

  // Note long press handler
  const handleLongPressNote = useCallback((noteId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedNoteIds(new Set([noteId]));
    }
  }, [isSelectionMode]);

  // Cancel selection handler
  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedNoteIds(new Set());
  }, []);

  // Delete selected notes handler
  const handleDeleteSelected = useCallback(async () => {
    try {
      await NoteListStorage.deleteNotes(Array.from(selectedNoteIds));
      await fetchNotes(); // Refresh list after deletion
      handleCancelSelection(); // Exit selection mode
    } catch (error) {
      console.error("Failed to delete selected notes:", error);
    }
  }, [selectedNoteIds, fetchNotes, handleCancelSelection]);

  // Copy selected notes handler
  const handleCopySelected = useCallback(async () => {
    try {
      await NoteListStorage.copyNotes(Array.from(selectedNoteIds));
      await fetchNotes(); // Refresh list after copy
      handleCancelSelection(); // Exit selection mode
    } catch (error) {
      console.error("Failed to copy selected notes:", error);
    }
  }, [selectedNoteIds, fetchNotes, handleCancelSelection]);

  // Create note handler
  const handleCreateNote = useCallback(async () => {
    try {
      const newNote = await NoteListStorage.createNote({ title: '新しいノート', content: '' });
      await fetchNotes(); // Refresh list after creation
      navigation.navigate('NoteEdit', { noteId: newNote.id });
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }, [navigation, fetchNotes]);

  return {
    notes,
    loading: { isLoading: loading }, // Adapt to the structure expected by NoteListScreen
    isSelectionMode,
    selectedNoteIds,
    handleSelectNote,
    handleLongPressNote,
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
    handleCreateNote,
    fetchNotes,
  };
};
