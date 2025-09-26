/**
 * ファイルエディタコンポーネント
 * プロトタイプのFileEditorクラスをReact Nativeコンポーネントに変換
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { DiffLine, DiffUtils, DiffManager } from '../../utils/diffUtils';
import { DiffView } from '../diff/DiffView';

export type ViewMode = 'content' | 'edit' | 'preview' | 'diff';

export interface FileViewerConfig {
  extensions: string[];
  editable: boolean;
}

interface FileEditorProps {
  filename: string;
  initialContent: string;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onSave: (content: string) => void;
  onClose: () => void;
}

// ファイル形式別の設定
const FILE_VIEWERS: Record<string, FileViewerConfig> = {
  text: {
    extensions: ['txt', 'log', 'cfg', 'ini'],
    editable: true,
  },
  markdown: {
    extensions: ['md', 'markdown'],
    editable: true,
  },
  code: {
    extensions: ['js', 'ts', 'py', 'java', 'c', 'cpp', 'css', 'html', 'json', 'xml', 'yaml', 'yml'],
    editable: true,
  },
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'],
    editable: false,
  },
  pdf: {
    extensions: ['pdf'],
    editable: false,
  },
  default: {
    extensions: [],
    editable: false,
  },
};

export const FileEditor: React.FC<FileEditorProps> = ({
  filename,
  initialContent,
  mode,
  onModeChange,
  onSave,
  onClose,
}) => {
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [originalContent] = useState(initialContent);
  const [currentDiff, setCurrentDiff] = useState<DiffLine[] | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(new Set());

  // ファイル形式の判定
  const viewerConfig = useMemo(() => {
    if (!filename) return FILE_VIEWERS.default;

    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return FILE_VIEWERS.default;

    for (const [type, config] of Object.entries(FILE_VIEWERS)) {
      if (config.extensions.includes(ext)) {
        return config;
      }
    }

    return FILE_VIEWERS.default;
  }, [filename]);

  // 変更状態の判定
  const isModified = useMemo(() => {
    return currentContent !== originalContent;
  }, [currentContent, originalContent]);

  // 差分生成
  const generateDiff = useCallback(() => {
    if (originalContent !== currentContent) {
      const diff = DiffUtils.generateDiff(originalContent, currentContent);
      setCurrentDiff(diff);
      DiffManager.initializeDiff(diff);
      setSelectedBlocks(new Set(DiffManager.getSelectedBlocks()));
      onModeChange('diff');
    }
  }, [originalContent, currentContent, onModeChange]);

  // 編集モードに切り替え
  const switchToEditMode = useCallback(() => {
    if (!viewerConfig.editable) {
      Alert.alert('エラー', 'このファイル形式は編集できません');
      return;
    }
    onModeChange('edit');
  }, [viewerConfig.editable, onModeChange]);

  // 保存処理
  const handleSave = useCallback(() => {
    if (!isModified) {
      Alert.alert('情報', '変更がないため保存をスキップしました');
      return;
    }

    if (mode === 'edit') {
      // 差分確認モードに移行
      generateDiff();
    } else {
      // 直接保存
      onSave(currentContent);
    }
  }, [isModified, mode, currentContent, generateDiff, onSave]);

  // 差分適用
  const handleApplyDiff = useCallback(() => {
    if (!currentDiff) return;

    const selectedContent = DiffManager.generateSelectedContent(currentDiff);
    if (selectedContent === null) {
      Alert.alert('エラー', '内容の生成に失敗しました');
      return;
    }

    onSave(selectedContent);
    onModeChange('content');
  }, [currentDiff, onSave, onModeChange]);

  // 差分キャンセル
  const handleCancelDiff = useCallback(() => {
    setCurrentDiff(null);
    DiffManager.reset();
    setSelectedBlocks(new Set());
    onModeChange('edit');
  }, [onModeChange]);

  // ブロック選択切り替え
  const handleBlockToggle = useCallback((blockId: number) => {
    DiffManager.toggleBlockSelection(blockId);
    setSelectedBlocks(new Set(DiffManager.getSelectedBlocks()));
  }, []);

  // 全選択切り替え
  const handleAllToggle = useCallback(() => {
    if (currentDiff) {
      DiffManager.toggleAllSelection(currentDiff);
      setSelectedBlocks(new Set(DiffManager.getSelectedBlocks()));
    }
  }, [currentDiff]);

  // ヘッダーボタンの表示制御
  const renderHeaderButtons = () => {
    return (
      <View style={styles.headerButtons}>
        {mode === 'content' && (
          <TouchableOpacity
            style={[styles.headerButton, !viewerConfig.editable && styles.disabledButton]}
            onPress={switchToEditMode}
            disabled={!viewerConfig.editable}
          >
            <Text style={styles.headerButtonText}>
              {viewerConfig.editable ? '✏️ 編集' : '👁️ 表示のみ'}
            </Text>
          </TouchableOpacity>
        )}

        {mode === 'edit' && (
          <>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => onModeChange('preview')}
            >
              <Text style={styles.headerButtonText}>👁️ プレビュー</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerButton, styles.saveButton, !isModified && styles.disabledButton]}
              onPress={handleSave}
              disabled={!isModified}
            >
              <Text style={[styles.headerButtonText, styles.saveButtonText]}>
                💾 保存
              </Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'preview' && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => onModeChange('edit')}
          >
            <Text style={styles.headerButtonText}>✏️ 編集に戻る</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.headerButton, styles.closeButton]}
          onPress={onClose}
        >
          <Text style={styles.headerButtonText}>✕ 閉じる</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // コンテンツのレンダリング
  const renderContent = () => {
    switch (mode) {
      case 'content':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.previewText}>{currentContent}</Text>
          </View>
        );

      case 'edit':
        return (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.textEditor}
              value={currentContent}
              onChangeText={setCurrentContent}
              multiline
              placeholder="ファイルの内容を編集してください..."
              placeholderTextColor="#999"
              textAlignVertical="top"
            />
          </View>
        );

      case 'preview':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.previewText}>{currentContent}</Text>
          </View>
        );

      case 'diff':
        return currentDiff ? (
          <DiffView
            diff={currentDiff}
            selectedBlocks={selectedBlocks}
            onBlockToggle={handleBlockToggle}
            onAllToggle={handleAllToggle}
            onApply={handleApplyDiff}
            onCancel={handleCancelDiff}
          />
        ) : null;

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.filename}>{filename}</Text>
        {renderHeaderButtons()}
      </View>

      {/* コンテンツ */}
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  filename: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
  },
  headerButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  saveButtonText: {
    color: '#fff',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    borderColor: '#6c757d',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#e9ecef',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#495057',
    fontFamily: 'monospace',
  },
  editContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textEditor: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'monospace',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
});