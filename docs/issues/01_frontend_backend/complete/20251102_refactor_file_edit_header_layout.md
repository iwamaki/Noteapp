---
filename: 20251102_refactor_file_edit_header_layout
status: in-progress
priority: medium
attempt_count: 1
tags: [refactoring, layout, UI, header]
date: 2025/11/02
---

## 概要 (Overview)

ファイル編集画面のヘッダーレイアウト構造をリファクタリングし、親コンポーネントが子コンポーネントのレイアウト比率を制御できるように設計を改善する。

## 背景 (Background)

現在、ヘッダーのレイアウト比率が複数箇所で定義されており、冗長かつ責任が不明確な状態になっている：
- `CustomHeader`コンポーネント内でleft/center/rightの比率を定義
- `useCustomHeader`フック内でもheaderContainerStyleで比率を定義
- 実際にはフック側の定義が優先され、コンポーネント側の定義が無視されている
- `useFileEditHeader`フックがレイアウト構造まで決定しており、責任過多

また、カテゴリー表示追加後に右側ボタンとの干渉問題が発生し、レイアウト比率を1:2:2に調整したが、設計が冗長なため変更箇所が分散している。

## 実装方針 (Implementation Strategy)

3つのファイルで責任を明確に分離：

1. **CustomHeader.tsx**
   - 汎用的なヘッダーコンポーネント（最小限の変更）
   - 他の画面でも使える設計を維持

2. **FileEditHeader.tsx**
   - ファイル編集画面専用のヘッダー全体を構成
   - 左中右のレイアウト構造と比率（1:2:2）を一箇所で定義
   - タイトル入力部分（カテゴリー + タイトル）とボタン群の配置を含む
   - 親が比率を決め、子（タイトル/ボタン）がそれに従う設計

3. **useFileEditHeader.tsx**
   - ボタンの状態管理とイベントハンドラーのみ
   - レイアウト構造の責任を持たない
   - `navigation.setOptions`でFileEditHeaderを設定

## 受け入れ条件 (Acceptance Criteria)

- [x] レイアウト比率の定義が一箇所に集約されている
- [ ] FileEditHeaderコンポーネントがヘッダー全体のレイアウトを管理
- [ ] useFileEditHeaderフックはロジックのみを扱う
- [ ] カテゴリー + タイトルが右側ボタンと干渉しない
- [ ] コードの冗長性が削減されている

## 関連ファイル (Related Files)

- `app/components/CustomHeader.tsx`
- `app/screen/file-edit/components/FileEditHeader.tsx`
- `app/screen/file-edit/hooks/useFileEditHeader.tsx`
- `app/screen/file-edit/FileEditScreen.tsx`

## 制約条件 (Constraints)

- React Navigationのヘッダー仕様に準拠する
- 既存の機能（タイトル編集、ボタン操作等）を維持
- 他の画面で使われるCustomHeaderに影響を与えない
- ファイルは分離したまま（統合しない）

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
  - カテゴリー表示機能を追加
  - レイアウト比率を1:2:2に調整（CustomHeaderとuseCustomHeader両方）
  - テキスト省略表示を実装

- **結果:**
  - カテゴリー表示は成功
  - レイアウト比率の調整が不完全（右側ボタンが依然としてはみ出す）
  - 設計の冗長性が明確になった

- **メモ:**
  - React NavigationではheaderContainerStyleが優先される
  - CustomHeaderコンポーネント内のスタイル定義が実質無視されている

---

## AIへの申し送り事項 (Handover to AI)

> **現在の状況:** レイアウト比率の問題と設計の冗長性を認識。リファクタリング方針を決定し、issue作成完了。
>
> **次のアクション:**
> 1. FileEditHeader.tsxに親コンポーネントとしてレイアウト構造を実装
> 2. useFileEditHeader.tsxからレイアウト責任を削除し、ロジックのみに集中
> 3. CustomHeader.tsxは最小限の修正に留める
>
> **考慮事項/ヒント:**
> - React Navigationの仕様上、headerContainerStyleでレイアウト比率を制御する必要がある
> - FileEditHeaderは専用コンポーネントなので、比率をハードコードして問題ない
> - useFileEditHeaderはボタンの状態とアクションのみを管理すべき
