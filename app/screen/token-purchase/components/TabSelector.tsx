/**
 * @file TabSelector.tsx
 * @summary Tab selector component
 * @description Displays tab buttons for switching between subscription and tokens
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type TabType = 'subscription' | 'tokens';

interface TabSelectorProps {
  selectedTab: TabType;
  onTabChange: (tab: TabType) => void;
  primaryColor: string;
  secondaryColor: string;
  textSecondaryColor: string;
}

export const TabSelector: React.FC<TabSelectorProps> = ({
  selectedTab,
  onTabChange,
  primaryColor,
  secondaryColor,
  textSecondaryColor,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.tab,
          selectedTab === 'subscription' && [styles.activeTab, { backgroundColor: primaryColor }],
          selectedTab !== 'subscription' && { backgroundColor: secondaryColor },
        ]}
        onPress={() => onTabChange('subscription')}
      >
        <Text
          style={[
            styles.tabText,
            selectedTab === 'subscription' && { color: '#FFFFFF' },
            selectedTab !== 'subscription' && { color: textSecondaryColor },
          ]}
        >
          サブスクリプション
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tab,
          selectedTab === 'tokens' && [styles.activeTab, { backgroundColor: primaryColor }],
          selectedTab !== 'tokens' && { backgroundColor: secondaryColor },
        ]}
        onPress={() => onTabChange('tokens')}
      >
        <Text
          style={[
            styles.tabText,
            selectedTab === 'tokens' && { color: '#FFFFFF' },
            selectedTab !== 'tokens' && { color: textSecondaryColor },
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
    paddingHorizontal: 16,
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
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
