/**
 * ファイルエディタコンポーネント
 * ユーザーがファイルを編集できるインターフェースを提供します。
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
import { generateDiff, DiffLine } from '../../../services/diffService';
import { useDiffManager } from '../../../hooks/useDiffManager';
import { DiffViewer } from '../../diff-view/components/DiffViewer';

// 表示モードの型定義
export type ViewMode = 'content' | 'edit' | 'preview' | 'diff';

// ファイルビューアの設定
export interface FileViewerConfig {
  extensions: string[];
  editable: boolean;
}

// コンポーネントのプロパティ定義
interface FileEditorProps {
  filename: string;
  initialContent: string;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onSave: (content: string) => void;
  onClose: () => void;
  onContentChange?: (content: string) => void;
}

// ファイル形式別の設定
const FILE_VIEWERS: Record<string, FileViewerConfig> = {
  text: { extensions: ['txt', 'log', 'cfg', 'ini'], editable: true },
  markdown: { extensions: ['md', 'markdown'], editable: true },
  code: { extensions: ['js', 'ts', 'py', 'java', 'c', 'cpp', 'css', 'html', 'json', 'xml', 'yaml', 'yml'], editable: true },
  image: { extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'], editable: false },
  pdf: { extensions: ['pdf'], editable: false },
  default: { extensions: [], editable: false },
};

// ファイルエディタコンポーネント
export const FileEditor: React.FC<FileEditorProps> = ({
  filename,
  initialContent,
  mode,
  onModeChange,
  onSave,
  onClose,
  onContentChange,
}) => {
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [originalContent] = useState(initialContent);

  // ファイル形式の判定
  const viewerConfig = useMemo(() => {
    if (!filename) return FILE_VIEWERS.default;
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext) return FILE_VIEWERS.default;
    for (const [, config] of Object.entries(FILE_VIEWERS)) {
      if (config.extensions.includes(ext)) {
        return config;
      }
    }
    return FILE_VIEWERS.default;
  }, [filename]);

  const diff = useMemo(() =>
    originalContent !== currentContent
      ? generateDiff(originalContent, currentContent)
      : [],
    [originalContent, currentContent]
  );

  const {
    selectedBlocks,
    toggleBlockSelection,
    toggleAllSelection,
    generateSelectedContent,
    allChangeBlockIds
  } = useDiffManager(diff);

  const isModified = useMemo(() => {
    return currentContent !== originalContent;
  }, [currentContent, originalContent]);

  const handleSavePress = useCallback(() => {
    if (!isModified) {
      Alert.alert('情報', '変更がないため保存をスキップしました');
      return;
    }
    onModeChange('diff');
  }, [isModified, onModeChange]);

  const switchToEditMode = useCallback(() => {
    if (!viewerConfig.editable) {
      Alert.alert('エラー', 'このファイル形式は編集できません');
      return;
    }
    onModeChange('edit');
  }, [viewerConfig.editable, onModeChange]);

  const handleApplyDiff = useCallback(() => {
    const selectedContent = generateSelectedContent();
    onSave(selectedContent);
    onModeChange('content');
  }, [generateSelectedContent, onSave, onModeChange]);

  const handleCancelDiff = useCallback(() => {
    onModeChange('edit');
  }, [onModeChange]);

  const allSelected = allChangeBlockIds.size > 0 && selectedBlocks.size === allChangeBlockIds.size;

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
              onPress={handleSavePress}
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
              onChangeText={(text) => {
                setCurrentContent(text);
                if (onContentChange) {
                  onContentChange(text);
                }
              }}
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
        return diff.length > 0 ? (
          <View style={{ flex: 1 }}>
            <DiffViewer
              diff={diff}
              selectedBlocks={selectedBlocks}
              onBlockToggle={toggleBlockSelection}
            />
            <View style={styles.footer}>
              <TouchableOpacity style={styles.controlButton} onPress={toggleAllSelection}>
                <Text style={styles.controlButtonText}>{allSelected ? '☑ All' : '☐ All'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, styles.applyButton]} onPress={handleApplyDiff}>
                <Text style={[styles.controlButtonText, styles.applyButtonText]}>✅ 適用</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, styles.cancelButton]} onPress={handleCancelDiff}>
                <Text style={styles.controlButtonText}>❌ キャンセル</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.filename}>{filename}</Text>
        {renderHeaderButtons()}
      </View>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#dee2e6' },
  filename: { fontSize: 16, fontWeight: '600', color: '#495057', flex: 1 },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  headerButton: { paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ced4da', borderRadius: 6 },
  headerButtonText: { fontSize: 12, color: '#495057', fontWeight: '500' },
  saveButton: { backgroundColor: '#28a745', borderColor: '#28a745' },
  saveButtonText: { color: '#fff' },
  closeButton: { backgroundColor: '#6c757d', borderColor: '#6c757d' },
  disabledButton: { opacity: 0.5, backgroundColor: '#e9ecef' },
  contentContainer: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  previewText: { fontSize: 14, lineHeight: 20, color: '#495057', fontFamily: 'monospace' },
  editContainer: { flex: 1, paddingHorizontal: 16, paddingVertical: 12 },
  textEditor: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: 'monospace', borderWidth: 1, borderColor: '#ced4da', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff' },
  footer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f8f9fa', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#dee2e6' },
  controlButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#dee2e6' },
  controlButtonText: { fontSize: 14, fontWeight: '500', color: '#495057' },
  applyButton: { backgroundColor: '#28a745', borderColor: '#28a745' },
  applyButtonText: { color: '#fff' },
  cancelButton: { backgroundColor: '#f8f9fa' },
});
