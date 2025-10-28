/**
 * @file VersionHistoryScreen.tsx
 * @summary このファイルは、アプリケーションのファイルのバージョン履歴画面をレンダリングします。
 * @responsibility 特定のファイルの過去のバージョンを一覧表示し、選択したバージョンと現在のファイルの差分を表示する機能を提供します。
 *
 * TODO: Update to use FileRepositoryFlat for flat structure migration
 * This screen is temporarily disabled as it depends on deleted FileRepositoryV2
 */

import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/types';
// import { FileRepositoryV2 } from '@data/repositories/fileRepositoryV2';
import { FileVersion, File } from '@data/core/types';
import { format } from 'date-fns';
import { useTheme } from '../../design/theme/ThemeContext';
import { useCustomHeader } from '../../components/CustomHeader';
import { Ionicons } from '@expo/vector-icons';
import { ListItem } from '../../components/ListItem';
import { MainContainer } from '../../components/MainContainer';

type VersionHistoryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VersionHistory'>;
type VersionHistoryScreenRouteProp = ReturnType<typeof useRoute<import('@react-navigation/native').RouteProp<RootStackParamList, 'VersionHistory'>>>;

function VersionHistoryScreen() {
  const navigation = useNavigation<VersionHistoryScreenNavigationProp>();
  const route = useRoute<VersionHistoryScreenRouteProp>();
  const { fileId } = route.params;
  const { colors, typography, spacing } = useTheme();
  const { createHeaderConfig } = useCustomHeader();

  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions(
      createHeaderConfig({
        title: <Text style={{ color: colors.text, fontSize: typography.header.fontSize }}>バージョン履歴</Text>,
        leftButtons: [
          {
            icon: <Ionicons name="arrow-back-outline" size={24} color={colors.text} />,
            onPress: () => navigation.goBack(),
          },
        ],
      })
    );
  }, [navigation, colors, typography]);

  const fetchVersions = useCallback(async () => {
    // TODO: Re-implement with FileRepositoryFlat
    setLoading(false);
    setError('バージョン履歴機能は現在利用できません。フラット構造への移行後に再実装されます。');

    /* Old implementation - disabled
    try {
      setLoading(true);
      setError(null);
      if (fileId) {
        const fetchedVersions = await FileRepositoryV2.getVersions(fileId);
        const fetchedCurrentFile = await FileRepositoryV2.getById(fileId);

        setCurrentFile(fetchedCurrentFile);

        if (fetchedCurrentFile) {
          const currentVersion: FileVersion = {
            id: 'current',
            fileId: fetchedCurrentFile.id,
            content: fetchedCurrentFile.content,
            version: fetchedCurrentFile.version,
            createdAt: fetchedCurrentFile.updatedAt,
          };
          const sortedFetchedVersions = fetchedVersions.sort((a: FileVersion, b: FileVersion) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setVersions([currentVersion, ...sortedFetchedVersions]);
        } else {
          const sortedFetchedVersions = fetchedVersions.sort((a: FileVersion, b: FileVersion) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setVersions(sortedFetchedVersions);
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(message);
      Alert.alert('Error', 'Failed to load version history.');
    } finally {
      setLoading(false);
    }
    */
  }, [fileId]);

  useFocusEffect(
    useCallback(() => {
      fetchVersions();
    }, [fetchVersions])
  );

  const handleSelectVersion = (selectedVersion: FileVersion) => {
    if (!currentFile || selectedVersion.id === 'current') {
      // Cannot compare the current version with itself
      return;
    }

    navigation.navigate('DiffView', {
      fileId: currentFile.id,
      versionId: selectedVersion.id,
      originalContent: currentFile.content, // 現在のファイルのコンテンツ
      newContent: selectedVersion.content,          // 選択された過去のバージョンのコンテンツ
      mode: 'restore'
    });
  };

  const styles = StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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

  const renderItem = ({ item }: { item: FileVersion }) => {
    const versionLabel = `Version ${item.version}${item.id === 'current' ? ' (Current)' : ''}`;
    return (
      <ListItem.Container
        onPress={() => handleSelectVersion(item)}
        disabled={item.id === 'current'}
      >
        <ListItem.Title numberOfLines={1}>
          {versionLabel}
        </ListItem.Title>
        <ListItem.Subtitle numberOfLines={1}>
          {format(new Date(item.createdAt), 'yyyy/MM/dd HH:mm:ss')}
        </ListItem.Subtitle>
        {item.content && (
          <ListItem.Description numberOfLines={2}>
            {item.content}
          </ListItem.Description>
        )}
      </ListItem.Container>
    );
  };

  return (
    <MainContainer
      backgroundColor={colors.secondary}
      isLoading={loading}
    >
      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      ) : versions.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No version history found for this file.</Text>
        </View>
      ) : (
        <FlatList
          data={versions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </MainContainer>
  );
}

export default VersionHistoryScreen;