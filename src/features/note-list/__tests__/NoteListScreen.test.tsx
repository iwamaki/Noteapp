
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import NoteListScreen from '../NoteListScreen';
import { useNoteStoreSelectors, useNoteStoreActions } from '../../../store/noteStore';
import { useNavigation, useIsFocused } from '@react-navigation/native';

// 各種フックのモック
jest.mock('../../../store/noteStore', () => ({
  useNoteStoreSelectors: jest.fn(),
  useNoteStoreActions: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useIsFocused: jest.fn(),
}));

jest.mock('../../../components/CustomHeader', () => ({
  useCustomHeader: () => ({
    createHeaderConfig: jest.fn(),
  }),
}));

// モックの型定義
const mockedUseNoteStoreSelectors = useNoteStoreSelectors as jest.Mock;
const mockedUseNoteStoreActions = useNoteStoreActions as jest.Mock;
const mockedUseNavigation = useNavigation as jest.Mock;
const mockedUseIsFocused = useIsFocused as jest.Mock;

describe('NoteListScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
  };
  const mockActions = {
    fetchNotes: jest.fn(),
    createNote: jest.fn(),
    toggleSelectionMode: jest.fn(),
    toggleNoteSelection: jest.fn(),
    clearSelectedNotes: jest.fn(),
    deleteSelectedNotes: jest.fn(),
    copySelectedNotes: jest.fn(),
  };

  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
    mockedUseNavigation.mockReturnValue(mockNavigation);
    mockedUseIsFocused.mockReturnValue(true);
    mockedUseNoteStoreActions.mockReturnValue(mockActions);
  });

  const renderScreen = () => render(<NoteListScreen />);

  test('通常モードではFABが表示される', () => {
    mockedUseNoteStoreSelectors.mockReturnValue({
      notes: [],
      loading: { isLoading: false },
      isSelectionMode: false,
      selectedNoteIds: new Set(),
    });

    renderScreen();

    // FABは "+" のテキストを持つ
    const fab = screen.getByText('+');
    expect(fab).toBeVisible();
  });

  test('選択モードではFABが表示されない', () => {
    mockedUseNoteStoreSelectors.mockReturnValue({
      notes: [{ id: '1', title: 'Test Note', content: 'Content', created_at: new Date(), updated_at: new Date() }],
      loading: { isLoading: false },
      isSelectionMode: true,
      selectedNoteIds: new Set(['1']),
    });

    renderScreen();

    const fab = screen.queryByText('+');
    expect(fab).toBeNull();
  });

  test('選択モードを解除するとFABが再表示される', () => {
    // 1. 最初は選択モード
    const initialStoreState = {
      notes: [{ id: '1', title: 'Test Note', content: 'Content', created_at: new Date(), updated_at: new Date() }],
      loading: { isLoading: false },
      isSelectionMode: true,
      selectedNoteIds: new Set(['1']),
    };
    mockedUseNoteStoreSelectors.mockReturnValue(initialStoreState);

    const { rerender } = renderScreen();

    // FABが表示されていないことを確認
    expect(screen.queryByText('+')).toBeNull();

    // 2. 選択モードを解除した状態をシミュレート
    const normalModeState = {
      ...initialStoreState,
      isSelectionMode: false,
      selectedNoteIds: new Set(),
    };
    mockedUseNoteStoreSelectors.mockReturnValue(normalModeState);
    
    // NoteListScreenを再レンダリング
    rerender(<NoteListScreen />);

    // FABが再表示されることを確認
    const fab = screen.getByText('+');
    expect(fab).toBeVisible();
  });

  test('ノート作成ボタンを押すとcreateNoteとnavigateが呼ばれる', () => {
    mockedUseNoteStoreSelectors.mockReturnValue({
      notes: [],
      loading: { isLoading: false },
      isSelectionMode: false,
      selectedNoteIds: new Set(),
    });
    // createNoteが新しいノートを返すように設定
    mockActions.createNote.mockResolvedValue({ id: 'new-note-id', title: '新しいノート', content: '' });

    renderScreen();

    const fab = screen.getByText('+');
    fireEvent.press(fab);

    // createNoteが呼ばれるのを待つ
    expect(mockActions.createNote).toHaveBeenCalled();
  });
});
