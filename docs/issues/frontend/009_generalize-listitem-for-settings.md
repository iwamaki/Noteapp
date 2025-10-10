---
title: "B_009_設定画面へのListItem汎用化適用"
id: 009
status: new
priority: medium
attempt_count: 0
tags: [UI, refactoring, ListItem]
---

## 概要 (Overview)

`ListItem`コンポーネントの汎用性をさらに高め、現在カスタム実装されている`SettingsScreen`のリストアイテムに適用します。これにより、アプリケーション全体でのUIの一貫性を向上させ、将来的なメンテナンスを容易にします。

## 背景 (Background)

`ListItem`コンポーネントは、`NoteListScreen`や`VersionHistoryScreen`で既に汎用的に使用されています。しかし、`SettingsScreen`では独自のUI要素が使用されており、UIの一貫性が損なわれている可能性があります。`ListItem`を`SettingsScreen`に適用することで、コンポーネントの再利用性を最大化し、デザインシステムへの準拠を強化します。

## 実装方針 (Implementation Strategy)

1.  `ListItem`コンポーネントを拡張し、`SettingsScreen`の要件（特に選択肢を持つ設定項目）に対応できるようなプロパティを追加または調整します。
2.  `SettingsScreen.tsx`内の`renderPicker`関数および関連するUIロジックをリファクタリングし、拡張された`ListItem`コンポーネントを使用するように変更します。
3.  `renderSection`で表示されるセクションタイトルについても、必要に応じて`ListItem`のスタイルを適用するか、`ListItem`のサブコンポーネントとして組み込むことを検討します。
4.  既存の機能が損なわれないことを確認するため、手動テストを実施します。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `SettingsScreen`のすべての設定項目が`ListItem`コンポーネントを使用してレンダリングされていること。
- [ ] `SettingsScreen`の各設定項目が、以前と同様に正しく機能すること（例: テーマ、フォントサイズ、LLMプロバイダー、モデルの選択と保存）。
- [ ] `ListItem`コンポーネントが`SettingsScreen`のUIデザインと一貫性のある見た目であること。
- [ ] `SettingsScreen`のパフォーマンスが既存の実装と同等以上であること。
- [ ] `ListItem`コンポーネントの変更が、既存の`NoteListScreen`および`VersionHistoryScreen`の機能に悪影響を与えないこと。

## 関連ファイル (Related Files)

- `app/components/ListItem.tsx`
- `app/screen/note-list/NoteListScreen.tsx` (影響がないことを確認)
- `app/screen/version-history/VersionHistoryScreen.tsx` (影響がないことを確認)
- `app/settings/SettingsScreen.tsx`
- `app/design/theme/ThemeContext.tsx` (スタイルの調整が必要な場合)
- `app/design/styles/commonStyles.ts` (スタイルの調整が必要な場合)

## 制約条件 (Constraints)

- 既存の`ListItem`の基本的な機能（onPress, onLongPress, isSelected, isSelectionMode）は維持すること。
- `SettingsScreen`の既存の機能が損なわれないこと。
- 新しいライブラリの追加は最小限に抑えること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** issueドキュメントの作成。
- **結果:** 完了。
- **メモ:** 次のステップは、このissueドキュメントに基づいて実装計画を立て、`ListItem.tsx`の拡張と`SettingsScreen.tsx`のリファクタリングを開始すること。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `ListItem`コンポーネントの汎用化と`SettingsScreen`への適用に関するissueドキュメントが作成されました。
- **次のアクション:** このissueドキュメントの内容に基づき、`ListItem.tsx`の拡張と`SettingsScreen.tsx`のリファクタリング計画を立案し、実行してください。
- **考慮事項/ヒント:** `SettingsScreen`の`renderPicker`関数が持つ選択肢の表示ロジックを、`ListItem`の内部または`ListItem`の`children`としてどのように組み込むかが主要な検討事項となります。特に、`pickerButtons`のレイアウトを`ListItem`内でどのように表現するかに注意してください。
