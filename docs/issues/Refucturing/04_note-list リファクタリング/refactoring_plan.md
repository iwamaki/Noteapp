# note-list リファクタリング実装計画

## 🎯 目標
- 保守性の向上
- 拡張性の向上
- テスタビリティの向上
- パフォーマンスの最適化

## 📂 新しいディレクトリ構造

```
app/screen/note-list/
├── components/          # UIコンポーネント
│   ├── TreeListItem.tsx
│   ├── CreateItemModal.tsx
│   ├── RenameItemModal.tsx
│   ├── NoteListEmptyState.tsx
│   └── OverflowMenu.tsx
├── hooks/               # カスタムフック
│   ├── useNoteList.ts
│   ├── useNoteTree.ts
│   ├── useItemSelection.ts
│   ├── useItemActions.ts    # ← 改善版
│   ├── useModalManager.ts   # ← 新規
│   ├── useErrorHandler.ts   # ← 新規
│   ├── useSearch.ts          # ← 拡張版
│   └── useNoteListHeader.tsx
├── services/            # ビジネスロジック層 (新規)
│   ├── noteService.ts
│   ├── folderService.ts
│   └── searchService.ts
├── noteStorage/         # データアクセス層
│   ├── index.ts
│   ├── storage.ts
│   ├── note.ts
│   └── folder.ts
├── utils/               # ユーティリティ
│   ├── pathUtils.ts
│   ├── treeUtils.ts
│   └── typeGuards.ts    # ← 新規
├── __tests__/           # テスト (新規)
│   ├── testUtils.ts
│   ├── noteService.test.ts
│   └── pathUtils.test.ts
└── NoteListScreen.tsx

```

## 🔄 段階的実装ステップ

### フェーズ 1: 基盤の整備 (1-2日)

#### 1.1 新しいユーティリティの追加
- [ ] `utils/typeGuards.ts` を作成
- [ ] 既存コードで型ガードを使用するように更新

#### 1.2 エラーハンドリングの統一
- [ ] `hooks/useErrorHandler.ts` を作成
- [ ] `StorageError` のメッセージ定義を改善

#### 1.3 テストインフラの構築
- [ ] `__tests__/testUtils.ts` を作成
- [ ] Jest設定を確認

### フェーズ 2: ビジネスロジック層の導入 (2-3日)

#### 2.1 サービス層の作成
- [ ] `services/noteService.ts` を作成
- [ ] `services/folderService.ts` を作成
- [ ] バリデーションロジックをサービス層に移動

#### 2.2 useItemActions の改善
- [ ] エラーハンドリングフックを統合
- [ ] サービス層を使用するように書き換え
- [ ] デバッグログを整理

### フェーズ 3: フックの整理とパフォーマンス最適化 (2-3日)

#### 3.1 モーダル管理の分離
- [ ] `hooks/useModalManager.ts` を作成
- [ ] `useNoteList.ts` からモーダルロジックを移動
- [ ] 関連コンポーネントを更新

#### 3.2 useNoteTree の最適化
- [ ] useMemo を使用してツリー構築を最適化
- [ ] 不要な再計算を削減
- [ ] パフォーマンステストを実施

#### 3.3 検索機能の拡張
- [ ] `useSearch.ts` を拡張版に置き換え
- [ ] 検索オプションUIを追加（オプショナル）
- [ ] 検索パフォーマンスを最適化

### フェーズ 4: テストの追加 (2-3日)

#### 4.1 ユニットテスト
- [ ] `pathUtils.test.ts`
- [ ] `treeUtils.test.ts`
- [ ] `noteService.test.ts`

#### 4.2 フックのテスト
- [ ] `useItemSelection.test.ts`
- [ ] `useSearch.test.ts`
- [ ] `useErrorHandler.test.ts`

#### 4.3 統合テスト
- [ ] ノート作成フローのテスト
- [ ] 移動操作のテスト
- [ ] エラーケースのテスト

### フェーズ 5: ドキュメントと最終調整 (1-2日)

#### 5.1 コードドキュメント
- [ ] TSDocコメントを追加
- [ ] README.mdを更新
- [ ] アーキテクチャ図を作成

#### 5.2 パフォーマンスチェック
- [ ] プロファイリングを実施
- [ ] メモリリークチェック
- [ ] レンダリングパフォーマンス確認

#### 5.3 後方互換性の確認
- [ ] 既存の機能がすべて動作することを確認
- [ ] 破壊的変更がないことを確認

## ⚠️ 注意事項

### 破壊的変更を避ける
- 既存のAPIを変更する際は、deprecatedマークをつけて段階的に移行
- 公開インターフェースを保持

### 段階的なリリース
1. 新しいコードを追加（既存コードと並行）
2. 新しいコードの動作確認
3. 古いコードから新しいコードへ移行
4. 古いコードを削除（十分なテスト後）

### レビューポイント
- [ ] コードの可読性
- [ ] テストカバレッジ（目標: 80%以上）
- [ ] パフォーマンス影響
- [ ] 型安全性
- [ ] エラーハンドリング

## 📊 成功指標

### 定量的指標
- テストカバレッジ: 80%以上
- バンドルサイズ: 現状維持または削減
- レンダリング時間: 現状維持または改善
- TypeScriptエラー: 0件

### 定性的指標
- コードの可読性向上
- 新機能追加の容易さ
- バグ修正の容易さ
- チーム内での理解のしやすさ

## 🚀 今後の拡張計画

### 短期 (1-2ヶ月)
- オフライン同期機能
- ノートの並び替え機能
- タグ管理の強化

### 中期 (3-6ヶ月)
- 共有・コラボレーション機能
- 高度な検索（正規表現、全文検索）
- エクスポート/インポート機能

### 長期 (6ヶ月以上)
- プラグインシステム
- カスタムテーマ
- AIアシスタント統合

## 📝 変更履歴

| 日付 | フェーズ | 変更内容 | 担当者 |
|------|---------|---------|--------|
| - | - | 初版作成 | - |

## 🔗 関連ドキュメント

- [アーキテクチャ概要](./docs/architecture.md)
- [コーディング規約](./docs/coding-standards.md)
- [テスト戦略](./docs/testing-strategy.md)