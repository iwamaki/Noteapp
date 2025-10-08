---
title: "アーキテクチャの簡素化：Feature-First設計への移行"
id: 39
status: done
priority: high
attempt_count: 0
tags: [refactoring, architecture, maintainability, simplification]
---

## 概要 (Overview)

過度な抽象化により複雑化したアーキテクチャを、Feature-First設計に再構築する。現在4層（features/services/store/eventBus）に分散しているノート機能を、各feature内に統合し、保守性と理解しやすさを向上させる。

## 背景 (Background)

Issue #37の修正過程で、以下の問題が明らかになった：

1. **責任の過度な分散**: ノート機能がservices/store/featuresの3箇所に分散
2. **selectNoteの二重実装**: `NoteService.selectNote()`と`noteStore.selectNote()`が存在し、責任が重複
3. **不必要な間接化**: EventBusを経由した複雑な通信フロー
4. **イベントリスナーの責任逸脱**: Store層がストレージ層に直接アクセス
5. **理解困難性**: 「ノートを開く」という1つの処理が4層・6ステップを経由

シンプルなノートアプリであるにも関わらず、フォルダ構成が複雑化しすぎており、新機能追加やバグ修正が困難になっている。

### 現状の処理フロー例（「ノートを開く」）
```
useNoteEditor()
  → noteService.selectNote()
    → ストレージ取得
      → eventBus.emit('note:selected')
        → noteStore listener
          → ストレージ再取得
            → set({ activeNote })
              → useNoteEditor再レンダリング
```
**4層、6ステップ、2回の重複ストレージアクセス**

## 受け入れ条件 (Acceptance Criteria)

### Phase 1: note-edit機能の独立化
- [ ] `features/note-edit/noteStorage.ts`を作成し、ストレージ操作を実装
- [ ] `useNoteEditor.ts`を書き直し、NoteService/noteStore依存を完全に除去
- [ ] ノートの閲覧・編集・保存が正常に動作することを確認
- [ ] 「ノートを開く」処理が1ファイル内で完結していることを確認

### Phase 2: note-list機能の独立化
- [ ] `features/note-list/noteStorage.ts`を作成
- [ ] `useNoteListLogic.ts`を書き直し、NoteService/noteStore依存を除去
- [ ] ノート一覧の取得・表示・検索が正常に動作することを確認
- [ ] 新規作成・削除などの操作が正常に動作することを確認

### Phase 3: diff-view機能の独立化
- [ ] `useDiffView.ts`（または類似ロジック）を作成・更新
- [ ] 差分表示・適用・破棄が正常に動作することを確認

### Phase 4: 不要なレイヤーの削除
- [ ] `services/NoteService.ts`を削除
- [ ] `store/note/noteStore.ts`を削除
- [ ] `services/eventBus.ts`を削除（他機能で未使用の場合）
- [ ] 全ての既存機能が正常に動作することを確認

### Phase 5: 共有コードの整理
- [ ] `shared/storage/asyncStorageUtils.ts`に低レベルなStorage抽象化のみを配置
- [ ] `shared/types/note.ts`は型定義のみを保持
- [ ] 各feature間でコードの重複がある場合、本当に共通化が必要か検討・実装

## 関連ファイル (Related Files)

### 削除対象
- `app/services/NoteService.ts`
- `app/store/note/noteStore.ts`
- `app/services/eventBus.ts`

### 大幅変更対象
- `app/features/note-edit/hooks/useNoteEditor.tsx`
- `app/features/note-list/hooks/useNoteListLogic.ts`
- `app/features/diff-view/DiffViewScreen.tsx`

### 新規作成
- `app/features/note-edit/noteStorage.ts`
- `app/features/note-list/noteStorage.ts`
- `app/shared/storage/asyncStorageUtils.ts`（必要に応じて）

### 参考
- `app/services/storageService.ts`（現行実装の参考として）
- `shared/types/note.ts`（型定義）

## 制約条件 (Constraints)

1. **段階的移行**: 一度に全てを変更せず、Phase単位で動作確認しながら進める
2. **機能の後退禁止**: 各Phase完了時点で、既存機能が全て動作する状態を維持
3. **型安全性の維持**: TypeScriptの型システムを最大限活用し、型安全性を損なわない
4. **AsyncStorageの利用継続**: データ永続化の基盤技術は変更しない
5. **React Navigationの統合**: 画面間のデータ受け渡しは引き続きroute paramsを利用
6. **過度な共通化の回避**: DRY原則よりも局所性・理解しやすさを優先。少量の重複は許容する

## 期待される改善効果

### 1. 理解しやすさの向上
- ノート編集に関わる全てのコードが`note-edit/`フォルダ内に集約
- 画面単位でフォルダが対応し、新規メンバーのオンボーディングが容易

### 2. 保守性の向上
- 変更の影響範囲が限定的（1 feature内で完結）
- バグ修正時の調査範囲が明確

### 3. パフォーマンスの改善
- 重複したストレージアクセスの削減
- 不要なイベント伝播の削減

### 4. 削除容易性
- 機能削除時はフォルダごと削除可能
- 依存関係が最小限のため、影響調査が不要

## 新アーキテクチャ構成

```
app/
├── features/
│   ├── note-list/
│   │   ├── NoteListScreen.tsx
│   │   ├── useNoteList.ts           ← 一覧のロジック全て
│   │   ├── noteStorage.ts           ← このfeature専用のストレージ操作
│   │   └── components/
│   │
│   ├── note-edit/
│   │   ├── NoteEditScreen.tsx
│   │   ├── useNoteEditor.ts         ← 編集のロジック全て
│   │   ├── noteStorage.ts           ← このfeature専用のストレージ操作
│   │   └── components/
│   │
│   └── diff-view/
│       ├── DiffViewScreen.tsx
│       └── useDiffView.ts
│
└── shared/
    ├── types/
    │   └── note.ts                  ← 型定義のみ
    └── storage/
        └── asyncStorageUtils.ts     ← 低レベルなStorage抽象化のみ
```

### 新しい処理フロー例（「ノートを開く」）
```typescript
// note-edit/useNoteEditor.ts
useEffect(() => {
  if (!noteId) {
    setNote(null);
    setIsLoading(false);
    return;
  }

  noteStorage.getById(noteId).then(loadedNote => {
    setNote(loadedNote);
    setIsLoading(false);
  });
}, [noteId]);
```
**1ファイル、1ストレージアクセス**

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** 未着手
- **結果:** -
- **メモ:** -

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- Issue #37のバグ修正過程でアーキテクチャの問題点を発見
- この文書を作成し、リファクタリング方針を策定した段階

### 次のアクション
1. **Phase 1から着手**: `note-edit`機能の独立化から開始
2. **具体的手順**:
   - `features/note-edit/noteStorage.ts`を作成（`storageService.ts`のNote関連メソッドを参考に）
   - `useNoteEditor.tsx`を書き直し（NoteService/noteStoreへの依存を除去）
   - 動作確認（ノート閲覧・編集・保存）
   - 問題なければPhase 2へ進む

### 考慮事項/ヒント
- 各Phaseは独立して動作可能な状態で完了させる（途中で中断しても問題ない設計）
- `storageService.ts`の実装は削除せず、参考として残しておく（移行完了後に削除）
- データ共有が必要な場面では、「URL parameter + ストレージ再取得」パターンを優先
- 本当に必要な場合のみ、軽量なグローバルキャッシュ（Zustand）を検討

---
