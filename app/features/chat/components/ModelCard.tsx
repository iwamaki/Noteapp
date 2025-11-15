/**
 * @file ModelCard.tsx
 * @summary モデル選択カードコンポーネント
 * @description モデル情報を表示し、選択可能なカードUI
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import type { ModelInfo } from '../../../screen/model-selection/constants';

interface ModelCardProps {
  model: ModelInfo;
  isActive: boolean;
  accentColor: string;
  tokens: number;
  category: 'quick' | 'think';
  onSelect: (modelId: string, category: 'quick' | 'think') => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isActive,
  accentColor,
  tokens,
  category,
  onSelect,
}) => {
  const { colors, spacing } = useTheme();

  const styles = StyleSheet.create({
    modelCard: {
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.transparent || 'transparent',
      backgroundColor: colors.secondary,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    modelCardActive: {
      backgroundColor: colors.secondary,
    },
    modelName: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.text,
    },
    modelDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    modelTokenRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    modelTokenAmount: {
      fontSize: 13,
      fontWeight: 'bold',
    },
    modelStatusBadge: {
      borderRadius: 4,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: colors.transparent || 'transparent',
    },
    modelStatusBadgeActive: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    modelStatusText: {
      fontSize: 11,
      fontWeight: 'bold',
    },
  });

  return (
    <TouchableOpacity
      key={model.id}
      style={[
        styles.modelCard,
        isActive && styles.modelCardActive,
        isActive && { borderColor: accentColor },
      ]}
      onPress={() => onSelect(model.id, category)}
      disabled={tokens <= 0}
    >
      {/* モデル名と説明 */}
      <View>
        <Text style={styles.modelName}>{model.name}</Text>
        <Text style={styles.modelDescription}>{model.description}</Text>
      </View>

      {/* トークン量と適用状態 */}
      <View style={styles.modelTokenRow}>
        <Text style={[styles.modelTokenAmount, { color: accentColor }]}>
          残高：{tokens.toLocaleString()} トークン
        </Text>

        {isActive ? (
          <View
            style={[
              styles.modelStatusBadge,
              styles.modelStatusBadgeActive,
              { backgroundColor: accentColor },
            ]}
          >
            <MaterialCommunityIcons
              name={category === 'quick' ? 'speedometer' : 'speedometer-slow'}
              size={14}
              color={colors.white}
            />
            <Text style={[styles.modelStatusText, { color: colors.white }]}>適用中</Text>
          </View>
        ) : (
          <View
            style={[
              styles.modelStatusBadge,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.modelStatusText,
                { color: tokens > 0 ? colors.text : colors.textSecondary },
              ]}
            >
              {tokens > 0 ? '選択' : '残高なし'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
