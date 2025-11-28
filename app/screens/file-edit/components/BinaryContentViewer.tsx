/**
 * @file BinaryContentViewer.tsx
 * @summary バイナリコンテンツ（画像など）を表示するコンポーネント
 * @description
 * 画像やPDFなどのバイナリファイルを適切に表示する。
 * base64エンコードされたコンテンツをデコードして表示。
 */

import React from 'react';
import { View, Image, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../../design/theme/ThemeContext';
import { SupportedMimeType } from '@data/core/typesFlat';

interface BinaryContentViewerProps {
  content: string;  // base64エンコードされたコンテンツ
  mimeType?: SupportedMimeType;
}

/**
 * バイナリコンテンツビューア
 * - 画像: Image コンポーネントで表示
 * - PDF: 未対応メッセージを表示（将来的にPDFビューア対応予定）
 * - その他: ファイルタイプ情報を表示
 */
export const BinaryContentViewer: React.FC<BinaryContentViewerProps> = ({
  content,
  mimeType,
}) => {
  const { colors, typography, spacing } = useTheme();
  const screenWidth = Dimensions.get('window').width;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    image: {
      width: screenWidth - spacing.md * 2,
      height: undefined,
      aspectRatio: 1,
      resizeMode: 'contain',
    },
    unsupportedContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    unsupportedText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    mimeTypeText: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
  });

  // 画像の場合
  if (mimeType?.startsWith('image/')) {
    const imageUri = `data:${mimeType};base64,${content}`;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContainer}
        maximumZoomScale={3}
        minimumZoomScale={1}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />
      </ScrollView>
    );
  }

  // PDFの場合（将来的に対応予定）
  if (mimeType === 'application/pdf') {
    return (
      <View style={styles.unsupportedContainer}>
        <Text style={styles.unsupportedText}>
          PDFファイルのプレビューは現在未対応です
        </Text>
        <Text style={styles.mimeTypeText}>
          {mimeType}
        </Text>
      </View>
    );
  }

  // その他のバイナリファイル
  return (
    <View style={styles.unsupportedContainer}>
      <Text style={styles.unsupportedText}>
        このファイル形式のプレビューはサポートされていません
      </Text>
      <Text style={styles.mimeTypeText}>
        {mimeType || 'application/octet-stream'}
      </Text>
    </View>
  );
};
