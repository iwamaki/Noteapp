/**
 * @file ModelSelectionScreen.tsx
 * @summary LLMモデル設定画面
 * @description
 * トークン保持状況ゲージ、装填中のモデル表示、モデル一覧を表示する画面。
 * 設定画面のトークン残高セクションから遷移する。
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../design/theme/ThemeContext';
import { RootStackParamList } from '../../navigation/types';
import { useSettingsStore, TOKEN_CAPACITY_LIMITS } from '../../settings/settingsStore';
import { GEMINI_PRICING } from '../../constants/pricing';
import { AVAILABLE_MODELS } from './constants';

type ModelSelectionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ModelSelection'>;

export const ModelSelectionScreen: React.FC = () => {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<ModelSelectionScreenNavigationProp>();
  const { settings, getTotalTokensByCategory, loadModel } = useSettingsStore();

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
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) return;

    const tokens = settings.tokenBalance.allocatedTokens[modelId] || 0;
    if (tokens <= 0) {
      // トークンがない場合は配分を促す
      // TODO: クレジット配分画面に遷移
      return;
    }

    await loadModel(category, modelId);
  };

  // モデルごとのトークン残高を取得
  const getModelTokens = (modelId: string): number => {
    return settings.tokenBalance.allocatedTokens[modelId] || 0;
  };

  // カテゴリーごとのモデル内訳（装填中モデルと他モデル）
  const getModelBreakdown = (category: 'quick' | 'think') => {
    const activeModelId = category === 'quick' ? activeQuickModel : activeThinkModel;
    const models = AVAILABLE_MODELS.filter(m => m.category === category);

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
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.secondary,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      marginRight: spacing.md,
    },
    headerTitle: {
      ...typography.title,
      color: colors.text,
    },
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
      flexDirection: 'row',
      alignItems: 'center',
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
    // 装填中のモデルカード
    loadedModelsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    loadedModelCard: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 3,
      padding: spacing.md,
    },
    loadedModelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    loadedModelIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    loadedModelTitles: {
      flex: 1,
    },
    loadedModelCategory: {
      fontSize: 11,
      fontWeight: 'bold',
    },
    loadedModelName: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.text,
    },
    loadedModelDescription: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    loadedModelDivider: {
      height: 1,
      opacity: 0.3,
      marginVertical: spacing.sm,
    },
    loadedModelBalance: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    loadedModelTokens: {
      fontSize: 22,
      fontWeight: 'bold',
    },
    loadedModelLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    // モデル選択カード
    modelCard: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.secondary,
      padding: spacing.md,
      marginBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    },
    modelCardActive: {
      borderWidth: 3,
      backgroundColor: colors.secondary,
    },
    modelCardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    modelRadio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    modelRadioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.background,
    },
    modelInfo: {
      flex: 1,
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
    modelPricing: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    modelTokenBox: {
      minWidth: 140,
      backgroundColor: colors.secondary,
      borderRadius: 6,
      padding: spacing.sm,
      marginLeft: spacing.md,
    },
    modelTokenBoxActive: {
      borderWidth: 2,
    },
    modelTokenLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    modelTokenRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    modelTokenAmount: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    modelTokenUnit: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    modelStatusBadge: {
      borderRadius: 4,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
      marginTop: spacing.xs,
    },
    modelStatusText: {
      fontSize: 11,
      fontWeight: 'bold',
      textAlign: 'center',
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
    icon: string,
    iconColor: string,
    current: number,
    limit: number,
    percent: number,
    activeTokens: number,
    otherTokens: number,
    activeModelId: string,
    category: 'quick' | 'think'
  ) => {
    const activeModel = AVAILABLE_MODELS.find(m => m.id === activeModelId);
    const otherModels = AVAILABLE_MODELS.filter(
      m => m.category === category && m.id !== activeModelId && getModelTokens(m.id) > 0
    );

    const activePercent = (activeTokens / limit) * 100;
    const otherPercent = (otherTokens / limit) * 100;
    const remaining = limit - current;
    const isNearLimit = percent >= 70;

    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeHeader}>
          <Text style={[styles.gaugeTitle, { color: iconColor }]}>
            {icon} {title}
          </Text>
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

  // 装填中モデルカード
  const renderLoadedModelCard = (
    category: 'quick' | 'think',
    modelId: string,
    tokens: number,
    bgColor: string,
    borderColor: string,
    iconColor: string,
    icon: string,
    categoryLabel: string
  ) => {
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) return null;

    return (
      <View style={[styles.loadedModelCard, { backgroundColor: bgColor, borderColor }]}>
        <View style={styles.loadedModelHeader}>
          <View style={[styles.loadedModelIcon, { backgroundColor: iconColor }]}>
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          </View>
          <View style={styles.loadedModelTitles}>
            <Text style={[styles.loadedModelCategory, { color: iconColor }]}>
              {categoryLabel}
            </Text>
            <Text style={styles.loadedModelName}>{model.name}</Text>
            <Text style={styles.loadedModelDescription}>{model.description}</Text>
          </View>
        </View>
        <View style={[styles.loadedModelDivider, { backgroundColor: borderColor }]} />
        <View style={styles.loadedModelBalance}>
          <Text style={[styles.loadedModelTokens, { color: iconColor }]}>
            {tokens.toLocaleString()}
          </Text>
          <Text style={styles.loadedModelLabel}>トークン残高</Text>
        </View>
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
    const model = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (!model) return null;

    const tokens = getModelTokens(modelId);
    const pricing = GEMINI_PRICING[modelId];

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
        <View style={styles.modelCardLeft}>
          <View
            style={[
              styles.modelRadio,
              { borderColor: isActive ? accentColor : colors.border },
            ]}
          >
            {isActive && <View style={styles.modelRadioInner} />}
          </View>
          <View style={styles.modelInfo}>
            <Text style={styles.modelName}>{model.name}</Text>
            <Text style={styles.modelDescription}>{model.description}</Text>
            {pricing && (
              <Text style={styles.modelPricing}>
                料金: ¥{pricing.inputPricePer1M}/1M入力 ¥{pricing.outputPricePer1M}/1M出力
              </Text>
            )}
          </View>
        </View>
        <View
          style={[
            styles.modelTokenBox,
            isActive && styles.modelTokenBoxActive,
            isActive && { backgroundColor: `${accentColor}15`, borderColor: accentColor },
          ]}
        >
          <Text style={styles.modelTokenLabel}>このモデルの残高</Text>
          <View style={styles.modelTokenRow}>
            <Text style={[styles.modelTokenAmount, { color: tokens > 0 ? accentColor : colors.textSecondary }]}>
              {tokens.toLocaleString()}
            </Text>
            <Text style={styles.modelTokenUnit}>トークン</Text>
          </View>
          {isActive ? (
            <View style={[styles.modelStatusBadge, { backgroundColor: accentColor }]}>
              <Text style={[styles.modelStatusText, { color: colors.white }]}>装填中</Text>
            </View>
          ) : (
            <View style={[styles.modelStatusBadge, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[styles.modelStatusText, { color: tokens > 0 ? colors.text : colors.textSecondary }]}>
                {tokens > 0 ? '選択' : '残高なし'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LLMモデル設定</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* トークン保持状況 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>トークン保持状況</Text>
          <Text style={styles.sectionDescription}>
            買いすぎ予防：各カテゴリーのMax容量に対する保持量
          </Text>

          {renderGauge(
            'QUICK',
            '⚡',
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
            '🧠',
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

        {/* 装填中のモデル */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>装填中のモデル</Text>
          <Text style={styles.sectionDescription}>
            チャット画面で使用されるモデルとトークン残高
          </Text>

          <View style={styles.loadedModelsRow}>
            {renderLoadedModelCard(
              'quick',
              activeQuickModel,
              quickBreakdown.activeTokens,
              '#FFF9E6',
              '#FFC107',
              '#FFC107',
              '⚡',
              'QUICK 装填中'
            )}
            {renderLoadedModelCard(
              'think',
              activeThinkModel,
              thinkBreakdown.activeTokens,
              '#E8F5E9',
              '#4CAF50',
              '#4CAF50',
              '🧠',
              'THINK 装填中'
            )}
          </View>
        </View>

        {/* Quickモデル一覧 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quickモデル一覧</Text>
          <Text style={styles.sectionDescription}>
            日常的な会話や軽いタスクに使用するモデルを選択
          </Text>

          {AVAILABLE_MODELS.filter(m => m.category === 'quick').map(model =>
            renderModelCard(model.id, 'quick', model.id === activeQuickModel, '#FFC107')
          )}
        </View>

        {/* Thinkモデル一覧 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thinkモデル一覧</Text>
          <Text style={styles.sectionDescription}>
            複雑な推論や高度なタスクに使用するモデルを選択
          </Text>

          {AVAILABLE_MODELS.filter(m => m.category === 'think').map(model =>
            renderModelCard(model.id, 'think', model.id === activeThinkModel, '#4CAF50')
          )}
        </View>

        {/* 追加モデルプレースホルダー */}
        <View style={styles.addModelPlaceholder}>
          <Text style={styles.addModelTitle}>+ 他のLLMモデルを追加購入</Text>
          <Text style={styles.addModelDescription}>
            GPT-4, Claude, Ultra Think等、様々なモデルのトークンを{'\n'}
            個別に購入して使い分けることができます（各カテゴリーに上限あり）
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};
