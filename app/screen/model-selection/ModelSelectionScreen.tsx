/**
 * @file ModelSelectionScreen.tsx
 * @summary LLMモデル設定画面
 * @description
 * トークン保持状況ゲージ、装填中のモデル表示、モデル一覧を表示する画面。
 * 設定画面のトークン残高セクションから遷移する。
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../design/theme/ThemeContext';
import { CustomHeader } from '../../components/CustomHeader';
import { MainContainer } from '../../components/MainContainer';
import { RootStackParamList } from '../../navigation/types';
import { useSettingsStore, TOKEN_CAPACITY_LIMITS } from '../../settings/settingsStore';
import { convertProvidersToModelInfo, type ModelInfo } from './constants';
import APIService from '../../features/chat/llmService/api';
import { CreditAllocationModal } from './components/CreditAllocationModal';

type ModelSelectionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ModelSelection'>;

export const ModelSelectionScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<ModelSelectionScreenNavigationProp>();
  const { settings, getTotalTokensByCategory, loadModel } = useSettingsStore();

  // バックエンドから取得したモデル一覧
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 配分モーダル制御
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedModelForAllocation, setSelectedModelForAllocation] = useState<string | undefined>(undefined);

  // モデル情報をバックエンドから取得
  useEffect(() => {
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
  }, []);

  // 現在選択されているモデル
  const activeQuickModel = settings.loadedModels.quick || 'gemini-2.5-flash';
  const activeThinkModel = settings.loadedModels.think || 'gemini-2.5-pro';

  // カテゴリーごとの合計トークン数と容量
  const quickTokens = getTotalTokensByCategory('quick');
  const thinkTokens = getTotalTokensByCategory('think');
  const quickLimit = TOKEN_CAPACITY_LIMITS.quick;
  const thinkLimit = TOKEN_CAPACITY_LIMITS.think;
  const quickPercent = (quickTokens / quickLimit) * 100;
  const thinkPercent = (thinkTokens / thinkLimit) * 100;

  // モデル選択ハンドラー
  const handleSelectModel = async (modelId: string, category: 'quick' | 'think') => {
    const model = availableModels.find(m => m.id === modelId);
    if (!model) return;

    const tokens = settings.tokenBalance.allocatedTokens[modelId] || 0;
    if (tokens <= 0) {
      // トークンがない場合は配分モーダルを開く
      setSelectedModelForAllocation(modelId);
      setShowAllocationModal(true);
      return;
    }

    await loadModel(category, modelId);
  };

  // トークン配分ボタンハンドラー（新規追加）
  const handleAllocateTokens = (modelId: string) => {
    setSelectedModelForAllocation(modelId);
    setShowAllocationModal(true);
  };

  // モデルごとのトークン残高を取得
  const getModelTokens = (modelId: string): number => {
    return settings.tokenBalance.allocatedTokens[modelId] || 0;
  };

  // カテゴリーごとのモデル内訳（装填中モデルと他モデル）
  const getModelBreakdown = (category: 'quick' | 'think') => {
    const activeModelId = category === 'quick' ? activeQuickModel : activeThinkModel;
    const models = availableModels.filter(m => m.category === category);

    // 装填中モデルのトークン数
    const activeTokens = getModelTokens(activeModelId);

    // 他のモデルの合計トークン数
    const otherTokens = models
      .filter(m => m.id !== activeModelId)
      .reduce((sum, m) => sum + getModelTokens(m.id), 0);

    return { activeModelId, activeTokens, otherTokens };
  };

  const quickBreakdown = getModelBreakdown('quick');
  const thinkBreakdown = getModelBreakdown('think');

  const styles = StyleSheet.create({
    scrollContent: {
      padding: spacing.md,
    },
    section: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      ...typography.subtitle,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    sectionDescription: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    // トークン保持状況ゲージ
    gaugeContainer: {
      marginBottom: spacing.lg,
    },
    gaugeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    gaugeTitle: {
      fontSize: 13,
      fontWeight: 'bold',
    },
    gaugeAmount: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    gaugeBarContainer: {
      height: 28,
      backgroundColor: colors.secondary,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      position: 'relative',
    },
    gaugeBar: {
      height: '100%',
      position: 'absolute',
      borderRadius: 14,
    },
    gaugeBarActive: {
      zIndex: 2,
    },
    gaugeBarOther: {
      zIndex: 1,
      opacity: 0.7,
    },
    gaugeDivider: {
      position: 'absolute',
      width: 2,
      height: '100%',
      backgroundColor: colors.background,
      zIndex: 3,
    },
    gaugePercent: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 4,
    },
    gaugePercentText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.text,
    },
    gaugeLegend: {
      flexDirection: 'row',
      marginTop: spacing.sm,
      gap: spacing.md,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    legendColor: {
      width: 12,
      height: 12,
      borderRadius: 2,
      marginRight: spacing.xs,
    },
    legendText: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    gaugeStatus: {
      fontSize: 10,
      marginTop: spacing.xs,
      textAlign: 'right',
    },
    // モデル選択カード
    modelCardWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    modelCard: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 3,
      borderColor: 'transparent',
      backgroundColor: colors.secondary,
      padding: spacing.md,
    },
    modelCardActive: {
      backgroundColor: colors.secondary,
    },
    modelCardContent: {
      flexDirection: 'column',
    },
    modelInfo: {
      flex: 1,
    },
    modelTokenRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
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
    modelTokenAmount: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#FFC107',
      marginTop: spacing.xs,
    },
    modelStatusBadge: {
      borderRadius: 4,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: 'transparent',
      alignSelf: 'flex-start',
    },
    modelStatusText: {
      fontSize: 11,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    allocateButton: {
      width: 56,
      borderRadius: 8,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    // 追加モデルプレースホルダー
    addModelPlaceholder: {
      borderRadius: 8,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      padding: spacing.lg,
      alignItems: 'center',
      marginTop: spacing.md,
    },
    addModelTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    addModelDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });

  // ゲージコンポーネント
  const renderGauge = (
    title: string,
    iconName: 'speedometer' | 'speedometer-slow',
    iconColor: string,
    current: number,
    limit: number,
    percent: number,
    activeTokens: number,
    otherTokens: number,
    activeModelId: string,
    category: 'quick' | 'think'
  ) => {
    const activeModel = availableModels.find(m => m.id === activeModelId);
    const otherModels = availableModels.filter(
      m => m.category === category && m.id !== activeModelId && getModelTokens(m.id) > 0
    );

    const activePercent = (activeTokens / limit) * 100;
    const otherPercent = (otherTokens / limit) * 100;
    const remaining = limit - current;
    const isNearLimit = percent >= 70;

    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MaterialCommunityIcons name={iconName} size={20} color={iconColor} />
            <Text style={[styles.gaugeTitle, { color: iconColor }]}>
              {title}
            </Text>
          </View>
          <Text style={styles.gaugeAmount}>
            {(current / 1_000_000).toFixed(2)}M / {(limit / 1_000_000).toFixed(2)}M
          </Text>
        </View>

        <View style={styles.gaugeBarContainer}>
          {/* 他のモデルのゲージ（背景層） */}
          {otherPercent > 0 && (
            <View
              style={[
                styles.gaugeBar,
                styles.gaugeBarOther,
                { width: `${otherPercent + activePercent}%`, backgroundColor: iconColor },
              ]}
            />
          )}
          {/* 装填中モデルのゲージ（前景層） */}
          <View
            style={[
              styles.gaugeBar,
              styles.gaugeBarActive,
              { width: `${activePercent}%`, backgroundColor: iconColor },
            ]}
          />
          {/* 境界線 */}
          {otherPercent > 0 && activePercent > 0 && (
            <View style={[styles.gaugeDivider, { left: `${activePercent}%` }]} />
          )}
          {/* パーセント表示 */}
          <View style={styles.gaugePercent}>
            <Text style={[styles.gaugePercentText, percent > 50 && { color: colors.white }]}>
              {percent.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.gaugeLegend}>
          {activeModel && (
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: iconColor }]} />
              <Text style={styles.legendText}>
                {activeModel.shortName}: {(activeTokens / 1_000_000).toFixed(2)}M (装填中)
              </Text>
            </View>
          )}
          {otherModels.map(model => (
            <View key={model.id} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: iconColor, opacity: 0.7 }]} />
              <Text style={styles.legendText}>
                {model.shortName}: {(getModelTokens(model.id) / 1_000_000).toFixed(2)}M
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={[
            styles.gaugeStatus,
            { color: isNearLimit ? colors.warning : colors.success },
          ]}
        >
          {isNearLimit ? '⚠' : '✓'} 残り{(remaining / 1_000_000).toFixed(2)}M購入可能
        </Text>
      </View>
    );
  };

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
      <View key={modelId} style={styles.modelCardWrapper}>
        <TouchableOpacity
          style={[
            styles.modelCard,
            isActive && styles.modelCardActive,
            isActive && { borderColor: accentColor },
          ]}
          onPress={() => handleSelectModel(modelId, category)}
          disabled={tokens <= 0}
        >
          <View style={styles.modelCardContent}>
            {/* モデル名と説明 */}
            <View style={styles.modelInfo}>
              <Text style={styles.modelName}>{model.name}</Text>
              <Text style={styles.modelDescription}>{model.description}</Text>
            </View>

            {/* トークン量と装填状態ボタンを同じ行に */}
            <View style={styles.modelTokenRow}>
              <Text style={styles.modelTokenAmount}>
                残高：{tokens.toLocaleString()} トークン
              </Text>

              {isActive ? (
                <View style={[styles.modelStatusBadge, { backgroundColor: accentColor }]}>
                  <Text style={[styles.modelStatusText, { color: colors.white }]}>装填中</Text>
                </View>
              ) : (
                <View style={[styles.modelStatusBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.modelStatusText, { color: tokens > 0 ? colors.text : colors.textSecondary }]}>
                    {tokens > 0 ? '選択' : '残高なし'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* トークン配分ボタン（リストアイテムの外側右） */}
        <TouchableOpacity
          style={styles.allocateButton}
          onPress={() => handleAllocateTokens(modelId)}
        >
          <MaterialCommunityIcons name="wallet-plus" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  // ローディング中またはエラー時の表示
  if (isLoadingModels) {
    return (
      <MainContainer>
        <CustomHeader
          title="LLMモデル設定"
          leftButtons={[
            {
              icon: <Ionicons name="arrow-back" size={24} color={colors.text} />,
              onPress: () => navigation.goBack(),
            },
          ]}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>
            モデル情報を読み込み中...
          </Text>
        </View>
      </MainContainer>
    );
  }

  if (loadError) {
    return (
      <MainContainer>
        <CustomHeader
          title="LLMモデル設定"
          leftButtons={[
            {
              icon: <Ionicons name="arrow-back" size={24} color={colors.text} />,
              onPress: () => navigation.goBack(),
            },
          ]}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.danger} />
          <Text style={{ marginTop: spacing.md, color: colors.danger, fontSize: 16, textAlign: 'center' }}>
            {loadError}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: spacing.lg,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              backgroundColor: colors.primary,
              borderRadius: 8,
            }}
            onPress={() => {
              setIsLoadingModels(true);
              setLoadError(null);
              // リロード処理は useEffect で自動的に行われる
            }}
          >
            <Text style={{ color: colors.white, fontWeight: 'bold' }}>再試行</Text>
          </TouchableOpacity>
        </View>
      </MainContainer>
    );
  }

  return (
    <MainContainer>
      <CustomHeader
        title="LLMモデル設定"
        leftButtons={[
          {
            icon: <Ionicons name="arrow-back" size={24} color={colors.text} />,
            onPress: () => navigation.goBack(),
          },
        ]}
      />
      <ScrollView style={styles.scrollContent}>
        {/* Quickモデル一覧 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quickモデル一覧</Text>
          <Text style={styles.sectionDescription}>
            日常的な会話や軽いタスクに使用するモデルを選択
          </Text>

          {availableModels.filter(m => m.category === 'quick').map(model =>
            renderModelCard(model.id, 'quick', model.id === activeQuickModel, '#FFC107')
          )}
        </View>

        {/* Thinkモデル一覧 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thinkモデル一覧</Text>
          <Text style={styles.sectionDescription}>
            複雑な推論や高度なタスクに使用するモデルを選択
          </Text>

          {availableModels.filter(m => m.category === 'think').map(model =>
            renderModelCard(model.id, 'think', model.id === activeThinkModel, '#4CAF50')
          )}
        </View>

        {/* トークン保持状況 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>トークン保持状況</Text>
          <Text style={styles.sectionDescription}>
            買いすぎ予防：各カテゴリーのMax容量に対する保持量
          </Text>

          {renderGauge(
            'QUICK',
            'speedometer',
            '#FFC107',
            quickTokens,
            quickLimit,
            quickPercent,
            quickBreakdown.activeTokens,
            quickBreakdown.otherTokens,
            quickBreakdown.activeModelId,
            'quick'
          )}

          {renderGauge(
            'THINK',
            'speedometer-slow',
            '#4CAF50',
            thinkTokens,
            thinkLimit,
            thinkPercent,
            thinkBreakdown.activeTokens,
            thinkBreakdown.otherTokens,
            thinkBreakdown.activeModelId,
            'think'
          )}
        </View>
      </ScrollView>

      {/* トークン配分モーダル */}
      <CreditAllocationModal
        isVisible={showAllocationModal}
        onClose={() => {
          setShowAllocationModal(false);
          setSelectedModelForAllocation(undefined);
        }}
        initialModelId={selectedModelForAllocation}
      />
    </MainContainer>
  );
};
