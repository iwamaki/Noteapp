---
filename: 004_refactor-app-identifiers-note-to-file # "[id]_[issueのタイトル]"
id: 004
status: new
priority: high
attempt_count: 0
tags: [refactoring, app, naming, identifiers, large-scale]
related_issues: [002]
---

## 概要 (Overview)

`app`フォルダ内の、ディレクトリ名、ファイル名、クラス名、関数名、変数名など、すべての識別子レベルで「note」を「file」に統一します。これは、Issue #002で完了した型定義レベルのリファクタリングに続く、実装レベルでの大規模な用語統一です。

## 背景 (Background)

Issue #002では、型定義レベル（`Note` → `File`、`NoteVersion` → `FileVersion`、型リテラル `'note'` → `'file'`）の置き換えが完了し、型チェックも成功しました。しかし、実装レベルでは依然として390箇所以上に"note"という用語が残っており、これが以下の問題を引き起こしています：

1. **認知的不一致**: 型定義では`File`だが、変数名は`note`、ファイル名は`NoteXxx.tsx`という不整合
2. **混乱の原因**: 「ファイル」を扱っているのに「ノート」という名前が使われている
3. **LLM連携の精度低下**: コード理解において用語の不一致が理解を妨げる
4. **保守性の低下**: 新しい開発者が混乱しやすい

このIssueでは、すべての識別子を統一し、コードベース全体の一貫性を確保します。

## 実装方針 (Implementation Strategy)

以下の順序で段階的に変更を実施します：

### Phase 1: ディレクトリ構造の変更
1. `app/screen/note-list/` → `app/screen/file-list/`
2. `app/screen/note-edit/` → `app/screen/file-edit/`
3. `app/screen/note-list/noteStorage/` → `app/screen/file-list/fileStorage/`

### Phase 2: ファイル名の変更
主要なファイル（23個）の名前を変更：
- `NoteEditScreen.tsx` → `FileEditScreen.tsx`
- `NoteListScreen.tsx` → `FileListScreen.tsx`
- `NoteRepository.ts` → `FileRepository.ts`
- `NoteDomainService.ts` → `FileDomainService.ts`
- `NoteEditorStore.ts` → `FileEditorStore.ts`
- `useNoteEditor.tsx` → `useFileEditor.tsx`
- `useNoteListChatContext.ts` → `useFileListChatContext.ts`
- など（全23ファイル）

### Phase 3: クラス名・インターフェース名の変更
- `NoteRepository` → `FileRepository`
- `AsyncStorageNoteRepository` → `AsyncStorageFileRepository`
- `NoteDomainService` → `FileDomainService`
- `NoteService` → `FileService`
- `NoteEditorStore` → `FileEditorStore`
- `NoteListUseCases` → `FileListUseCases`
- `NoteListContext` → `FileListContext`
- `NoteListProvider` → `FileListProvider`
- `NoteEditStorage` → `FileEditStorage`
- `NoteListStorage` → `FileListStorage`
- など

### Phase 4: 関数名・変数名の変更
- `noteId` → `fileId` (すべてのファイルで)
- `createNote` → `createFile`
- `updateNote` → `updateFile`
- `deleteNote` → `deleteFile`
- `getNoteById` → `getFileById`
- `getAllNotes` → `getAllFiles`
- `saveNote` → `saveFile`
- `currentNote` → `currentFile`
- `selectedNotes` → `selectedFiles`
- など（390箇所以上）

### Phase 5: コメント・ドキュメントの更新
- JSDocコメント内の「ノート」→「ファイル」
- ファイルヘッダーコメントの更新
- 関数説明コメントの更新

### Phase 6: ナビゲーション・ルート名の更新
- `NoteEdit` → `FileEdit`
- `NoteList` → `FileList`
- 関連するナビゲーションパラメータの更新

## 受け入れ条件 (Acceptance Criteria)

- [ ] `app`フォルダ内のすべてのディレクトリ名で「note」が「file」に変更されていること
- [ ] `app`フォルダ内のすべてのファイル名で「note」が「file」に変更されていること
- [ ] すべてのクラス名・インターフェース名で「Note」が「File」に変更されていること
- [ ] すべての関数名・変数名で「note」が「file」に変更されていること
- [ ] アプリケーションがビルドエラーなく、正常に動作すること（型チェック完了）
- [ ] 既存の単体テストおよびE2Eテストが全てパスすること
- [ ] ナビゲーションが正常に機能すること
- [ ] UI上の動作において問題がないこと

## 関連ファイル (Related Files)

### ディレクトリ（3箇所）
- `app/screen/note-edit/`
- `app/screen/note-list/`
- `app/screen/note-list/noteStorage/`

### ファイル（23箇所）
- `app/screen/note-edit/NoteEditScreen.tsx`
- `app/screen/note-edit/components/NoteEditHeader.tsx`
- `app/screen/note-edit/components/NoteEditOverflowMenu.tsx`
- `app/screen/note-edit/hooks/useNoteEditor.tsx`
- `app/screen/note-edit/hooks/useNoteEditHeader.tsx`
- `app/screen/note-edit/repositories/AsyncStorageNoteRepository.ts`
- `app/screen/note-edit/repositories/NoteRepository.ts`
- `app/screen/note-edit/repositories/noteStorage.ts`
- `app/screen/note-edit/services/NoteService.ts`
- `app/screen/note-edit/stores/NoteEditorStore.ts`
- `app/screen/note-list/NoteListScreen.tsx`
- `app/screen/note-list/components/NoteListEmptyState.tsx`
- `app/screen/note-list/components/NoteListSearchBar.tsx`
- `app/screen/note-list/application/NoteListUseCases.ts`
- `app/screen/note-list/context/NoteListContext.tsx`
- `app/screen/note-list/context/NoteListProvider.tsx`
- `app/screen/note-list/context/noteListReducer.ts`
- `app/screen/note-list/context/useNoteListContext.ts`
- `app/screen/note-list/domain/NoteDomainService.ts`
- `app/screen/note-list/hooks/useNoteListHeader.tsx`
- `app/screen/note-list/infrastructure/NoteRepository.ts`
- `app/screen/note-list/noteStorage/note.ts`
- `app/features/chat/hooks/useNoteListChatContext.ts`
- `app/features/chat/hooks/useNoteEditChatContext.ts`

### コード内の変更箇所（390箇所以上）
- 全44ファイルにわたる変数名・関数名の変更

## 制約条件 (Constraints)

- このIssueでは、`app`フォルダ内のファイルのみを変更対象とします
- `folder`関連の用語は、このIssueの範囲では変更しません
- 変更は段階的に行い、各Phase完了後に動作確認を行います
- UIの日本語表示（「ノート」など）は変更しません（内部の識別子のみ変更）
- AsyncStorageのキー名は互換性のため変更しません

## 技術的課題 (Technical Challenges)

### 1. ディレクトリ移動の影響範囲
ディレクトリ名を変更すると、すべてのimportパスが変更されます。これは自動リファクタリングツールでは完全には対応できないため、慎重な手動確認が必要です。

### 2. Gitの履歴保持
`git mv`を使用してディレクトリとファイルを移動することで、Git履歴を保持します。

### 3. 循環的な依存関係
多くのファイルが相互に依存しているため、一括変更が必要な箇所と段階的変更が可能な箇所を見極める必要があります。

### 4. ナビゲーション型定義
`RootStackParamList`などのナビゲーション型定義の変更は、アプリ全体に影響します。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** Issue #002完了後の状態分析と、残存する"note"の洗い出し
- **結果:** 390箇所以上のnote関連の識別子を発見
- **メモ:** このIssueドキュメントを作成し、段階的なリファクタリング計画を策定

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** Issue #002で型定義レベルのリファクタリングは完了。型チェックも成功している。しかし、実装レベルでは390箇所以上に"note"が残存。
- **次のアクション:**
  1. Phase 1から順番に実施
  2. 各Phase完了後に型チェック（`npm run type-check`）を実行
  3. 可能であれば各Phase完了後にコミット
  4. 全Phase完了後に実機テストを実施
- **考慮事項/ヒント:**
  - `git mv`を使用してファイル/ディレクトリを移動すること（履歴保持のため）
  - importパスの自動更新には限界があるため、grep検索で漏れをチェック
  - ナビゲーション関連の変更は特に慎重に（画面遷移が壊れる可能性）
  - AsyncStorageのキー名は変更しない（データ互換性のため）
  - UIの日本語テキストは変更しない（ユーザーには引き続き「ノート」と表示）
- **リスク:**
  - 大規模な変更のため、一度に全てを変更すると問題の特定が困難
  - 段階的に進め、各段階で動作確認することが重要
  - 特にPhase 1（ディレクトリ移動）は影響範囲が大きいため、慎重に実施

## 推奨アプローチ (Recommended Approach)

この大規模リファクタリングを安全に実施するための推奨アプローチ：

1. **Phase 1のみを先に実施し、コミット**
   - ディレクトリ構造の変更とimportパスの更新
   - 型チェック確認
   - コミット

2. **Phase 2-3を実施し、コミット**
   - ファイル名とクラス名の変更
   - 型チェック確認
   - コミット

3. **Phase 4を実施し、コミット**
   - 関数名・変数名の変更
   - 型チェック確認
   - コミット

4. **Phase 5-6を実施し、最終確認**
   - コメント・ドキュメント・ナビゲーションの更新
   - 型チェック確認
   - 実機テスト
   - 最終コミット

各Phaseの間で問題が発生した場合は、前のコミットに戻ることができます。
