/**
 * @file NoteListScreen.test.tsx
 * @summary `NoteListScreen`コンポーネントの単体テストを定義します。
 * @responsibility `NoteListScreen`がノートのリスト表示、選択モードの切り替え、ノートの作成、およびFABボタンの表示/非表示ロジックを正しく処理するかを検証します。
 */

import React from 'react';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import NoteListScreen from '../../features/note-list/NoteListScreen';
import { useNavigation, useIsFocused } from '@react-navigation/native';

// 各種フックのモック
jest.mock('../../../store/note', () => ({
  useNoteStore: jest.fn((selector) => {
    const mockState = {
      filteredNotes: (global as any).mockNoteStoreState?.filteredNotes || [],
      loading: (global as any).mockNoteStoreState?.loading || { isLoading: false },
      fetchNotes: (global as any).mockNoteStoreActions?.fetchNotes || jest.fn(),
      createNote: (global as any).mockNoteStoreActions?.createNote || jest.fn(),
    };
    return selector(mockState);
  }),
  useNoteSelectionStore: jest.fn((selector) => {
    const mockState = {
      isSelectionMode: (global as any).mockSelectionStoreState?.isSelectionMode || false,
      selectedNoteIds: (global as any).mockSelectionStoreState?.selectedNoteIds || new Set(),
      toggleSelectionMode: (global as any).mockSelectionStoreActions?.toggleSelectionMode || jest.fn(),
      toggleNoteSelection: (global as any).mockSelectionStoreActions?.toggleNoteSelection || jest.fn(),
      clearSelectedNotes: (global as any).mockSelectionStoreActions?.clearSelectedNotes || jest.fn(),
      deleteSelectedNotes: (global as any).mockSelectionStoreActions?.deleteSelectedNotes || jest.fn(),
      copySelectedNotes: (global as any).mockSelectionStoreActions?.copySelectedNotes || jest.fn(),
    };
    return selector(mockState);
  }),
}));

// ナビゲーションとフォーカスのモック
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useIsFocused: jest.fn(),
}));

// カスタムヘッダーのモック
jest.mock('../../../components/CustomHeader', () => ({
  useCustomHeader: () => ({
    createHeaderConfig: jest.fn(),
  }),
}));

// モックの型定義
const mockedUseNavigation = useNavigation as jest.Mock;
const mockedUseIsFocused = useIsFocused as jest.Mock;

// NoteListScreenコンポーネントのテスト
describe('NoteListScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
  };
  const mockNoteStoreActions = {
    fetchNotes: jest.fn(),
    createNote: jest.fn(),
  };
  const mockSelectionStoreActions = {
    toggleSelectionMode: jest.fn(),
    toggleNoteSelection: jest.fn(),
    clearSelectedNotes: jest.fn(),
    deleteSelectedNotes: jest.fn(),
    copySelectedNotes: jest.fn(),
  };

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedUseNavigation.mockReturnValue(mockNavigation);
    mockedUseIsFocused.mockReturnValue(true);

    // グローバルにモック状態を設定
    (global as any).mockNoteStoreActions = mockNoteStoreActions;
    (global as any).mockSelectionStoreActions = mockSelectionStoreActions;
  });

  // 各テストの後にタイマーをクリアしてエラーを防止
  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  const renderScreen = () => render(<NoteListScreen />);

  test('通常モードではFABが表示される', () => {
    (global as any).mockNoteStoreState = {
      filteredNotes: [],
      loading: { isLoading: false },
    };
    (global as any).mockSelectionStoreState = {
      isSelectionMode: false,
      selectedNoteIds: new Set(),
    };

    renderScreen();

    // FABは "+" のテキストを持つ
    const fab = screen.getByText('+');
    expect(fab).toBeVisible();
  });

  test('選択モードではFABが表示されない', () => {
    (global as any).mockNoteStoreState = {
      filteredNotes: [{ id: '1', title: 'Test Note', content: 'Content', created_at: new Date(), updated_at: new Date() }],
      loading: { isLoading: false },
    };
    (global as any).mockSelectionStoreState = {
      isSelectionMode: true,
      selectedNoteIds: new Set(['1']),
    };

    renderScreen();

    const fab = screen.queryByText('+');
    expect(fab).toBeNull();
  });

  test('選択モードを解除するとFABが再表示される', () => {
    // 1. 最初は選択モード
    (global as any).mockNoteStoreState = {
      filteredNotes: [{ id: '1', title: 'Test Note', content: 'Content', created_at: new Date(), updated_at: new Date() }],
      loading: { isLoading: false },
    };
    (global as any).mockSelectionStoreState = {
      isSelectionMode: true,
      selectedNoteIds: new Set(['1']),
    };

    const { rerender } = renderScreen();

    // FABが表示されていないことを確認
    expect(screen.queryByText('+')).toBeNull();

    // 2. 選択モードを解除した状態をシミュレート
    (global as any).mockSelectionStoreState = {
      isSelectionMode: false,
      selectedNoteIds: new Set(),
    };

    // NoteListScreenを再レンダリング
    rerender(<NoteListScreen />);

    // FABが再表示されることを確認
    const fab = screen.getByText('+');
    expect(fab).toBeVisible();
  });

  test('ノート作成ボタンを押すとcreateNoteとnavigateが呼ばれる', () => {
    (global as any).mockNoteStoreState = {
      filteredNotes: [],
      loading: { isLoading: false },
    };
    (global as any).mockSelectionStoreState = {
      isSelectionMode: false,
      selectedNoteIds: new Set(),
    };
    // createNoteが新しいノートを返すように設定
    mockNoteStoreActions.createNote.mockResolvedValue({ id: 'new-note-id', title: '新しいノート', content: '' });

    renderScreen();

    const fab = screen.getByText('+');
    fireEvent.press(fab);

    // createNoteが呼ばれるのを待つ
    expect(mockNoteStoreActions.createNote).toHaveBeenCalled();
  });
});
