# 差分表示機能アーカイブ

このディレクトリには、バージョン管理システム削除時に取り除いた差分表示機能の実装が保存されています。

## 概要

差分表示機能は、2つのテキスト間の違いを視覚的に表示するための機能です。
LCS（最長共通部分列）アルゴリズムを使用して、行レベルと文字レベルの差分を計算します。

## アーカイブ内容

### コードベース

- `diff-view/` - 差分表示画面の完全な実装
  - `DiffViewScreen.tsx` - 差分表示画面のメインコンポーネント
  - `components/DiffViewer.tsx` - 差分表示UIコンポーネント（150行）
  - `hooks/useDiffView.tsx` - 差分表示ロジック（102行）
  - `services/diffService.ts` - 差分計算コアロジック（307行）
    - LCSアルゴリズム実装
    - ハイブリッド差分表示（行レベル + 文字レベル）
    - データ整合性検証機能
  - `services/diffService.test.ts` - テストコード
  - `services/testHybridDiff.ts` - テストヘルパー

### ドキュメント

- `B_001_hybrid_diff_display.md` - ハイブリッド差分表示の設計・実装ドキュメント
- `10_diff-feature-refactor.md` - 差分機能のリファクタリング記録
- `18_implement-llm-edit-diff-apply-flow.md` - LLM編集との統合実装

## 主要機能

### 1. LCSアルゴリズム実装

```typescript
export const computeCharacterLevelDiff = (
  originalText: string,
  newText: string
): DiffLine[] => {
  // 文字レベルで差分を計算
  // O(mn) の動的計画法で実装
}
```

### 2. ハイブリッド差分表示

- 行レベルの差分表示
- 文字レベルの差分表示（行内変更の強調表示）
- 追加/削除/変更なしの3種類の表示

### 3. データ型定義

```typescript
interface DiffLine {
  type: 'common' | 'added' | 'deleted';
  content: string;
  originalLineNumber: number | null;
  newLineNumber: number | null;
  changeBlockId?: number | null;
  inlineChanges?: InlineChange[];
}

interface InlineChange {
  type: 'equal' | 'delete' | 'insert';
  content: string;
  startIndex: number;
  endIndex: number;
}
```

## 元の用途

1. **バージョン復元時の差分表示**
   - 現在のファイルと過去のバージョンの比較
   - 復元前のプレビュー

2. **編集内容の確認**
   - 保存前の変更内容確認
   - 編集履歴の可視化

## 再実装時の参考情報

### 必要な依存関係

```typescript
// ナビゲーション設定
DiffView: {
  mode: 'readonly';
  originalContent: string;
  newContent: string;
}
```

### 使用例

```typescript
import { computeCharacterLevelDiff } from './services/diffService';

const diffLines = computeCharacterLevelDiff(
  originalContent,
  newContent
);

// diffLinesをDiffViewerコンポーネントに渡す
<DiffViewer diffLines={diffLines} />
```

### パフォーマンス特性

- 時間計算量: O(mn) (m, n = テキスト長)
- 空間計算量: O(mn)
- 最適化: 大きなファイルでは行単位での計算を推奨

## 削除理由

バージョン管理システム全体を削除する際に、その主要な表示機能として実装されていた差分表示も削除されました。
ただし、この実装は汎用的なテキスト差分計算として価値があるため、アーカイブとして保存しています。

## 今後の活用案

1. **エディタ内差分表示**
   - Undo/Redo時の変更プレビュー
   - 保存前の変更確認ダイアログ

2. **LLM編集結果の差分表示**
   - LLMによる編集提案の可視化
   - Apply前の変更内容確認

3. **ファイル比較機能**
   - 複数ファイル間の比較
   - テキスト検索結果の差分表示

## アーカイブ日

2025-10-29

## 関連issue

- バージョン管理システム削除: [issue参照]
- 差分機能の保存要望により本アーカイブを作成
