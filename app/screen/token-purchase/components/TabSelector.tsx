/**
 * @file TabSelector.tsx
 * @summary Tab selector component
 * @description Displays tab buttons for switching between subscription and tokens
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';

type TabType = 'subscription' | 'tokens';

interface TabSelectorProps {
  selectedTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TabSelector: React.FC<TabSelectorProps> = ({
  selectedTab,
  onTabChange,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { paddingHorizontal: theme.spacing.lg }]}>
      <TouchableOpacity
        style={[
          styles.tab,
          selectedTab === 'subscription' && [styles.activeTab, { backgroundColor: theme.colors.primary }],
          selectedTab !== 'subscription' && { backgroundColor: theme.colors.secondary },
        ]}
        onPress={() => onTabChange('subscription')}
      >
        <Text
          style={[
            { fontSize: theme.typography.subtitle.fontSize, fontWeight: '600' },
            selectedTab === 'subscription' && { color: theme.colors.white },
            selectedTab !== 'subscription' && { color: theme.colors.textSecondary },
          ]}
        >
          サブスクリプション
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          selectedTab === 'tokens' && [styles.activeTab, { backgroundColor: theme.colors.primary }],
          selectedTab !== 'tokens' && { backgroundColor: theme.colors.secondary },
        ]}
        onPress={() => onTabChange('tokens')}
      >
        <Text
          style={[
            { fontSize: theme.typography.subtitle.fontSize, fontWeight: '600' },
            selectedTab === 'tokens' && { color: theme.colors.white },
            selectedTab !== 'tokens' && { color: theme.colors.textSecondary },
          ]}
        >
          トークンパッケージ
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {},
});
