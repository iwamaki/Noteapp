/**
 * @file ModelSelectionModal.tsx
 * @summary LLMモデル選択モーダル
 * @description
 * チャット履歴画面のヘッダーから呼び出されるモデル選択モーダル
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../../design/theme/ThemeContext';
import { CustomModal } from '../../../components/CustomModal';
import { useSettingsStore } from '../../../settings/settingsStore';
import { convertProvidersToModelInfo, type ModelInfo } from '../../../screen/model-selection/constants';
import APIService from '../llmService/api';

interface ModelSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({
  isVisible,
  onClose,
}) => {
  const { colors, spacing, typography } = useTheme();
  const { settings, loadModel } = useSettingsStore();

  // バックエンドから取得したモデル一覧
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // モデル情報をバックエンドから取得
  useEffect(() => {
    if (!isVisible) return;

    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        setLoadError(null);

        // プロバイダー情報を取得（キャッシュがあれば即座に返る）
        const providers = await APIService.loadLLMProviders();

        // ModelInfo形式に変換
        const models = convertProvidersToModelInfo(providers);

        if (models.length === 0) {
          setLoadError('利用可能なモデルがありません');
        } else {
          setAvailableModels(models);
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        setLoadError('モデル情報の読み込みに失敗しました');
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [isVisible]);

  // 現在選択されているモデル
  const activeQuickModel = settings.loadedModels.quick || 'gemini-2.5-flash';
  const activeThinkModel = settings.loadedModels.think || 'gemini-2.5-pro';

  // モデルごとのトークン残高を取得
  const getModelTokens = (modelId: string): number => {
    return settings.tokenBalance.allocatedTokens[modelId] || 0;
  };

  // モデル選択ハンドラー
  const handleSelectModel = async (modelId: string, category: 'quick' | 'think') => {
    const model = availableModels.find(m => m.id === modelId);
    if (!model) return;

    const tokens = getModelTokens(modelId);
    if (tokens <= 0) {
      // トークンがない場合は警告メッセージを表示
      // （簡易版なので、ここでは単純に選択を無効化）
      return;
    }

    // モデルを選択するが、モーダルは閉じない
    await loadModel(category, modelId);
  };

  const styles = StyleSheet.create({
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
      borderColor: 'transparent',
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
      borderColor: 'transparent',
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
  });

  // モデル選択カード
  const renderModelCard = (
    modelId: string,
    category: 'quick' | 'think',
    isActive: boolean,
    accentColor: string
  ) => {
    const model = availableModels.find(m => m.id === modelId);
    if (!model) return null;

    const tokens = getModelTokens(modelId);

    return (
      <TouchableOpacity
        key={modelId}
        style={[
          styles.modelCard,
          isActive && styles.modelCardActive,
          isActive && { borderColor: accentColor },
        ]}
        onPress={() => handleSelectModel(modelId, category)}
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
            <View style={[styles.modelStatusBadge, { backgroundColor: accentColor, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <MaterialCommunityIcons
                name={category === 'quick' ? 'speedometer' : 'speedometer-slow'}
                size={14}
                color={colors.white}
              />
              <Text style={[styles.modelStatusText, { color: colors.white }]}>適用中</Text>
            </View>
          ) : (
            <View style={[styles.modelStatusBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.modelStatusText, { color: tokens > 0 ? colors.text : colors.textSecondary }]}>
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
          <Text style={styles.loadingText}>モデル情報を読み込み中...</Text>
        </View>
      );
    }

    if (loadError) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setIsLoadingModels(true);
              setLoadError(null);
            }}
          >
            <Text style={styles.retryButtonText}>再試行</Text>
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
            <Text style={[styles.sectionTitle, { color: colors.accentQuick }]}>Quickモデル</Text>
          </View>

          {availableModels.filter(m => m.category === 'quick').map(model =>
            renderModelCard(model.id, 'quick', model.id === activeQuickModel, colors.accentQuick)
          )}
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
            <Text style={[styles.sectionTitle, { color: colors.accentThink }]}>Thinkモデル</Text>
          </View>

          {availableModels.filter(m => m.category === 'think').map(model =>
            renderModelCard(model.id, 'think', model.id === activeThinkModel, colors.accentThink)
          )}
        </View>
      </>
    );
  };

  return (
    <CustomModal
      isVisible={isVisible}
      title="LLMモデル選択"
      buttons={[
        {
          text: '閉じる',
          style: 'cancel',
          onPress: onClose,
        },
      ]}
      onClose={onClose}
    >
      {renderContent()}
    </CustomModal>
  );
};
