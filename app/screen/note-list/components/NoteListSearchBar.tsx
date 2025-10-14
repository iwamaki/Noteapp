import React from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

interface NoteListSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  isSearchActive?: boolean;
}

export const NoteListSearchBar: React.FC<NoteListSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  placeholder = "Search notes...",
  placeholderTextColor,
  isSearchActive = false,
}) => {
  const { colors, spacing } = useTheme();

  const styles = StyleSheet.create({
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: spacing.sm,
      paddingHorizontal: isSearchActive ? spacing.sm : spacing.md,
      height: 40,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
    },
  });

  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || colors.textSecondary}
        autoFocus
      />
    </View>
  );
};
