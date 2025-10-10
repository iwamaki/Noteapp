/**
 * @file VersionHistoryScreen.tsx
 * @summary このファイルは、アプリケーションのノートのバージョン履歴画面をレンダリングします。
 * @responsibility 特定のノートの過去のバージョンを一覧表示し、選択したバージョンと現在のノートの差分を表示する機能を提供します。
 */

import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
import { NoteEditStorage } from '../note-edit/noteStorage';
import { NoteVersion, Note } from '../../../shared/types/note';
import { format } from 'date-fns';
import { useTheme } from '../../design/theme/ThemeContext';
import { useCustomHeader } from '../../components/CustomHeader';
import { Ionicons } from '@expo/vector-icons';
import { ListItem } from '../../components/ListItem';

type VersionHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VersionHistory'>;
type VersionHistoryScreenRouteProp = ReturnType<typeof useRoute<import('@react-navigation/native').RouteProp<RootStackParamList, 'VersionHistory'>>>;

function VersionHistoryScreen() {
  const navigation = useNavigation<VersionHistoryScreenNavigationProp>();
  const route = useRoute<VersionHistoryScreenRouteProp>();
  const { noteId } = route.params;
  const { colors, typography, spacing } = useTheme();
  const { createHeaderConfig } = useCustomHeader();

  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions(
      createHeaderConfig({
        title: <Text style={{ color: colors.text, fontSize: typography.header.fontSize }}>バージョン履歴</Text>,
        leftButtons: [
          {
            icon: <Ionicons name="arrow-back-outline" size={24} color={colors.textSecondary} />,
            onPress: () => navigation.goBack(),
            variant: 'secondary',
          },
        ],
      })
    );
  }, [navigation, colors, typography]);

  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (noteId) {
        const fetchedVersions = await NoteEditStorage.getNoteVersions(noteId);
        const fetchedCurrentNote = await NoteEditStorage.getNoteById(noteId);
        setCurrentNote(fetchedCurrentNote);

        // Also add the current version to the list for context, but designate it
        if (fetchedCurrentNote) {
          const currentVersion = {
            id: 'current',
            noteId: fetchedCurrentNote.id,
            content: fetchedCurrentNote.content,
            version: fetchedCurrentNote.version,
            createdAt: fetchedCurrentNote.updatedAt,
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
  }, [noteId]);

  useFocusEffect(
    useCallback(() => {
      fetchVersions();
    }, [fetchVersions])
  );

  const handleSelectVersion = (selectedVersion: NoteVersion) => {
    if (!currentNote || selectedVersion.id === 'current') {
      // Cannot compare the current version with itself
      return;
    }
    
    navigation.navigate('DiffView', {
      noteId: currentNote.id,
      versionId: selectedVersion.id,
      originalContent: selectedVersion.content,
      newContent: currentNote.content,
      mode: 'restore'
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.secondary,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    errorText: {
      color: colors.danger,
      ...typography.body,
    },
    listContainer: {
      padding: spacing.md,
    },
    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
    },
  });

  const renderItem = ({ item }: { item: NoteVersion }) => (
    <ListItem
      title={`Version ${item.version} ${item.id === 'current' ? '(Current)' : ''}`}
      subtitle={format(new Date(item.createdAt), 'yyyy/MM/dd HH:mm:ss')}
      description={item.content}
      onPress={() => handleSelectVersion(item)}
      disabled={item.id === 'current'}
    />
  );

  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" color={colors.primary} />;
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
        <Text style={styles.emptyText}>No version history found for this note.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={versions}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
    />
  );
}

export default VersionHistoryScreen;