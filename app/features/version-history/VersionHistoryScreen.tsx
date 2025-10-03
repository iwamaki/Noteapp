/**
 * @file VersionHistoryScreen.tsx
 * @summary このファイルは、アプリケーションのノートのバージョン履歴画面をレンダリングします。
 * @responsibility 特定のノートの過去のバージョンを一覧表示し、選択したバージョンと現在のノートの差分を表示する機能を提供します。
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { NoteStorageService } from '../../services/storageService';
import { NoteVersion } from '../../../shared/types/note';
import { useNoteStore } from '../../store/note';
import { format } from 'date-fns';

type VersionHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VersionHistory'>;
type VersionHistoryScreenRouteProp = ReturnType<typeof useRoute<import('@react-navigation/native').RouteProp<RootStackParamList, 'VersionHistory'>>>;

function VersionHistoryScreen() {
  const navigation = useNavigation<VersionHistoryScreenNavigationProp>();
  const route = useRoute<VersionHistoryScreenRouteProp>();
  const { noteId } = route.params;
  const activeNote = useNoteStore(state => state.activeNote);

  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (noteId) {
        const fetchedVersions = await NoteStorageService.getNoteVersions(noteId);
        // Also add the current version to the list for context, but designate it
        if (activeNote) {
          const currentVersion = {
            id: 'current',
            noteId: activeNote.id,
            content: activeNote.content,
            version: activeNote.version,
            createdAt: activeNote.updatedAt,
          };
          setVersions([currentVersion, ...fetchedVersions]);
        } else {
          setVersions(fetchedVersions);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(message);
      Alert.alert('Error', 'Failed to load version history.');
    } finally {
      setLoading(false);
    }
  }, [noteId, activeNote]);

  useFocusEffect(
    useCallback(() => {
      fetchVersions();
    }, [fetchVersions])
  );

  const handleSelectVersion = (selectedVersion: NoteVersion) => {
    if (!activeNote || selectedVersion.id === 'current') {
      // Cannot compare the current version with itself
      return;
    }
    
    navigation.navigate('DiffView', {
      noteId: activeNote.id,
      versionId: selectedVersion.id,
      originalContent: selectedVersion.content,
      newContent: activeNote.content,
      mode: 'restore'
    });
  };

  const renderItem = ({ item }: { item: NoteVersion }) => (
    <TouchableOpacity 
      style={styles.itemContainer} 
      onPress={() => handleSelectVersion(item)}
      disabled={item.id === 'current'}
    >
      <Text style={styles.itemTitle}>
        Version {item.version} {item.id === 'current' && '(Current)'}
      </Text>
      <Text style={styles.itemDate}>
        {format(new Date(item.createdAt), 'yyyy/MM/dd HH:mm:ss')}
      </Text>
      <Text style={styles.itemPreview} numberOfLines={2}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (versions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No version history found for this note.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={versions}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
  },
  listContainer: {
    padding: 10,
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemDate: {
    fontSize: 12,
    color: '#666',
    marginVertical: 4,
  },
  itemPreview: {
    fontSize: 14,
    color: '#333',
  },
});

export default VersionHistoryScreen;