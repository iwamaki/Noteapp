/**
 * @file markdownRules.tsx
 * @summary マークダウンレンダリングの共通ルール定義
 * @description react-native-markdown-displayで使用するカスタムレンダリングルールを提供します
 */

import React, { useState } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';

/**
 * 画像レンダリングコンポーネント
 * @description エラーハンドリング、ローディング表示、サイズ制限、レスポンシブ対応を実装
 */
interface MarkdownImageProps {
  src: string;
  alt?: string;
  maxWidth?: number;
  colors: {
    text: string;
    textSecondary: string;
    border: string;
  };
}

const MarkdownImage: React.FC<MarkdownImageProps> = ({ src, alt, maxWidth, colors }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const screenWidth = Dimensions.get('window').width;
  const effectiveMaxWidth = maxWidth || screenWidth * 0.8;

  const handleLoad = (event: any) => {
    const { width, height } = event.nativeEvent.source;
    setImageDimensions({ width, height });
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // アスペクト比を維持しながら最大幅に収める
  const getImageStyle = () => {
    if (!imageDimensions.width || !imageDimensions.height) {
      return { width: effectiveMaxWidth, height: 200 }; // デフォルトサイズ
    }

    const aspectRatio = imageDimensions.width / imageDimensions.height;
    const width = Math.min(imageDimensions.width, effectiveMaxWidth);
    const height = width / aspectRatio;

    return { width, height };
  };

  const styles = StyleSheet.create({
    container: {
      marginVertical: 8,
      alignItems: 'center',
    },
    image: {
      borderRadius: 8,
      backgroundColor: colors.border + '20',
    },
    loadingContainer: {
      width: effectiveMaxWidth,
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.border + '20',
      borderRadius: 8,
    },
    errorContainer: {
      width: effectiveMaxWidth,
      padding: 16,
      backgroundColor: colors.border + '40',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    errorText: {
      color: colors.textSecondary,
      fontSize: 12,
      textAlign: 'center',
    },
    errorSource: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 4,
      textAlign: 'center',
    },
    altText: {
      color: colors.text,
      fontSize: 11,
      marginTop: 4,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    hiddenImage: {
      display: 'none',
    },
  });

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>画像を読み込めませんでした</Text>
          {alt && <Text style={styles.altText}>{alt}</Text>}
          <Text style={styles.errorSource}>
            {src}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.text} />
        </View>
      )}
      <Image
        source={{ uri: src }}
        style={[styles.image, getImageStyle(), loading && styles.hiddenImage]}
        resizeMode="contain"
        onLoad={handleLoad}
        onError={handleError}
      />
      {!loading && !error && alt && (
        <Text style={styles.altText}>{alt}</Text>
      )}
    </View>
  );
};

/**
 * マークダウンレンダリングルールを生成
 * @param colors - テーマカラー
 * @param maxImageWidth - 画像の最大幅（オプション）
 */
export const getMarkdownRules = (colors: { text: string; textSecondary: string; border: string }, maxImageWidth?: number) => {
  return {
    /**
     * 画像レンダリングルール
     * @description ローカルファイル、リモートURL、Base64に対応
     * @param node - マークダウンノード
     * @returns 画像コンポーネント
     */
    image: (node: any) => {
      const src = node.attributes?.src || '';
      const alt = node.attributes?.alt || '';

      return (
        <MarkdownImage
          key={node.key}
          src={src}
          alt={alt}
          maxWidth={maxImageWidth}
          colors={colors}
        />
      );
    },
  };
};
