/**
 * @file ModelSelectionModal.tsx
 * @summary LLMモデル選択モーダル
 * @description チャット履歴画面のヘッダーから呼び出されるモデル選択モーダル
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../design/theme/ThemeContext';
import type { ModelInfo } from '../../../screens/model-selection/constants';
import { useModelSelection } from '../hooks/useModelSelection';

interface ModelSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({
  isVisible,
  onClose,
}) => {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();

  const {
    availableModels,
    isLoadingModels,
    loadError,
    activeQuickModel,
    activeThinkModel,
    getModelTokens,
    handleSelectModel,
    handleRetry,
  } = useModelSelection({ isVisible });

  const styles = StyleSheet.create({
    centeredView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.overlay,
      padding: spacing.xl,
    },
    modalView: {
      backgroundColor: colors.background,
      borderRadius: 12,
      width: '100%',
      maxWidth: 400,
      height: 600,
      borderWidth: 1,
      borderColor: colors.tertiary,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      overflow: 'hidden',
      flexDirection: 'column',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      padding: spacing.lg,
      textAlign: 'center',
      color: colors.text,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    scrollView: {
      flex: 1,
    },
    scrollContentContainer: {
      padding: spacing.lg,
      flexGrow: 1,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    sectionIcon: {
      marginRight: spacing.xs,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: 'bold',
    },
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
    loadingContainer: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacing.md,
      color: colors.textSecondary,
    },
    errorContainer: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    errorText: {
      marginTop: spacing.md,
      color: colors.danger,
      fontSize: 14,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: 8,
    },
    retryButtonText: {
      color: colors.white,
      fontWeight: 'bold',
    },
    buttonContainer: {
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    closeButton: {
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xl,
      width: '100%',
    },
    closeButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  // モデルカードをレンダリング
  const renderModelCard = (
    model: ModelInfo,
    isActive: boolean,
    accentColor: string,
    category: 'quick' | 'think'
  ) => {
    const tokens = getModelTokens(model.id);

    const cardStyle = [
      styles.modelCard,
      isActive && styles.modelCardActive,
      isActive && { borderColor: accentColor },
    ];

    return (
      <TouchableOpacity
        key={model.id}
        style={cardStyle}
        onPress={() => {
          if (tokens > 0) {
            handleSelectModel(model.id, category);
          }
        }}
        activeOpacity={tokens > 0 ? 0.7 : 1}
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

  // コンテンツをレンダリング
  const renderContent = () => {
    if (isLoadingModels) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('chat.modelSelection.loading')}</Text>
        </View>
      );
    }

    if (loadError) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>{t('common.button.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {/* Quickモデル一覧 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="speedometer"
              size={20}
              color={colors.accentQuick}
              style={styles.sectionIcon}
            />
            <Text style={[styles.sectionTitle, { color: colors.accentQuick }]}>
              {t('chat.modelSelection.quickModels')}
            </Text>
          </View>

          {availableModels
            .filter(m => m.category === 'quick')
            .map(model => renderModelCard(
              model,
              model.id === activeQuickModel,
              colors.accentQuick,
              'quick'
            ))}
        </View>

        {/* Thinkモデル一覧 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="speedometer-slow"
              size={20}
              color={colors.accentThink}
              style={styles.sectionIcon}
            />
            <Text style={[styles.sectionTitle, { color: colors.accentThink }]}>
              {t('chat.modelSelection.thinkModels')}
            </Text>
          </View>

          {availableModels
            .filter(m => m.category === 'think')
            .map(model => renderModelCard(
              model,
              model.id === activeThinkModel,
              colors.accentThink,
              'think'
            ))}
        </View>
      </>
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.centeredView} onPress={onClose}>
        <Pressable style={styles.modalView} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{t('chat.modelSelection.title')}</Text>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContentContainer}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            onMoveShouldSetResponder={() => true}
          >
            {renderContent()}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>{t('common.button.close')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
