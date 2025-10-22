import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

interface NoteListSearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  isSearchActive?: boolean;
}

export const FileListSearchBar: React.FC<NoteListSearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  placeholder = "Search ...",
  placeholderTextColor,
  isSearchActive = false,
}) => {
  const { colors, spacing, typography } = useTheme();
  const [inputText, setInputText] = useState(searchQuery);

  // 親コンポーネントからsearchQueryがリセットされた時に内部stateも更新
  useEffect(() => {
    setInputText(searchQuery);
  }, [searchQuery]);

  const handleSubmit = () => {
    setSearchQuery(inputText);
  };

  const styles = StyleSheet.create({
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isSearchActive ? spacing.sm : spacing.md,
      paddingVertical: spacing.sm,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: typography.subtitle.fontSize,
      textAlignVertical: 'center',
      paddingVertical: 0,
      includeFontPadding: false,
    },
  });

  return (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        value={inputText}
        onChangeText={setInputText}
        onSubmitEditing={handleSubmit}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || colors.textSecondary}
        autoFocus
        returnKeyType="search"
      />
    </View>
  );
};
