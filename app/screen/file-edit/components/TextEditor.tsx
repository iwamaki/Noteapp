/**
 * @file TextEditor.tsx
 * @summary テキスト編集コンポーネント（ワードラップ対応行番号表示）
 */

import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '@design/theme/ThemeContext';

interface TextEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  placeholder?: string;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  content,
  onContentChange,
  placeholder = 'ファイルの内容を編集してください...',
}) => {
  const { colors, typography } = useTheme();

  // エディタの幅と各行の高さを状態管理
  const [editorWidth, setEditorWidth] = useState<number>(0);
  const [lineHeights, setLineHeights] = useState<{ [key: number]: number }>({});

  // 論理行に分割（useMemoで最適化）
  const lines = useMemo(() => {
    return content.split('\n');
  }, [content]);

  // 行番号カラムの幅を計算（桁数に応じて動的に変更）
  const lineNumberColumnWidth = useMemo(() => {
    const maxLineNumber = lines.length;
    const digits = maxLineNumber.toString().length;
    // 1桁あたり8px + 右パディング（2px）
    return digits * 8 + 2;
  }, [lines.length]);

  // 各行の高さを更新
  const updateLineHeight = (index: number, height: number) => {
    setLineHeights(prev => {
      if (prev[index] === height) return prev; // 変更なしならskip
      return { ...prev, [index]: height };
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row', // 横並びレイアウト
    },
    lineNumberColumn: {
      backgroundColor: colors.secondary,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingRight: 2,
      paddingLeft: 0,
      paddingTop: 4,
    },
    lineNumberWrapper: {
      justifyContent: 'flex-start',
    },
    lineNumber: {
      fontSize: typography.caption.fontSize,
      color: colors.textSecondary,
      textAlign: 'right',
      fontFamily: 'monospace',
    },
    editorWrapper: {
      flex: 1,
    },
    textEditor: {
      ...typography.body,
      fontFamily: 'monospace',
      lineHeight: typography.body.lineHeight,
      borderLeftWidth: 0,
      borderTopWidth: 0,
      borderRightWidth: 0,
      borderBottomWidth: 0,
      borderColor: colors.border,
      borderRadius: 0,
      backgroundColor: colors.background,
      color: colors.text,
      textAlignVertical: 'top',
      flex: 1,
      paddingTop: 3,
      paddingBottom: 3,
      paddingLeft: 3,
      paddingRight: 3,
    },
    // 隠し測定用Text（画面外に配置）
    hiddenMeasureContainer: {
      position: 'absolute',
      left: -10000, // 画面外
      top: 0,
    },
    hiddenMeasureText: {
      ...typography.body,
      fontFamily: 'monospace',
      lineHeight: typography.body.lineHeight,
    },
  });

  return (
    <View style={styles.container}>
      {/* 隠し測定用Text（画面外） */}
      {editorWidth > 0 && (
        <View style={styles.hiddenMeasureContainer}>
          {lines.map((line, i) => (
            <Text
              key={`measure-${i}`}
              style={[styles.hiddenMeasureText, { width: editorWidth }]}
              onLayout={(e) => {
                const height = e.nativeEvent.layout.height;
                updateLineHeight(i, height);
              }}
            >
              {line || ' '} {/* 空行でも高さを持たせる */}
            </Text>
          ))}
        </View>
      )}

      {/* 行番号カラム */}
      <View style={[styles.lineNumberColumn, { width: lineNumberColumnWidth }]}>
        {lines.map((_, i) => {
          const height = lineHeights[i] || typography.body.lineHeight;
          return (
            <View key={i} style={[styles.lineNumberWrapper, { height }]}>
              <Text style={styles.lineNumber}>{i + 1}</Text>
            </View>
          );
        })}
      </View>

      {/* エディタ本体 */}
      <View style={styles.editorWrapper}>
        <TextInput
          style={styles.textEditor}
          value={content}
          onChangeText={onContentChange}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            if (width > 0 && width !== editorWidth) {
              setEditorWidth(width);
            }
          }}
          multiline
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          scrollEnabled={false} // TextInput自体のスクロールは親に委譲
        />
      </View>
    </View>
  );
};
