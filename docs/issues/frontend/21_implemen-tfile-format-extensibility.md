---
title: "ファイル形式拡張性への対応実装"
id: 21
status: new
priority: low
attempt_count: 0
tags: [architecture, file-management, UI]
---

## 概要 (Overview)

Markdown以外のファイル形式（画像、PDF、コードファイルなど）をノートアプリで表示・編集できるようにするための基盤を構築し、具体的なファイル形式（例: 画像）の表示機能を実装します。これにより、アプリケーションの汎用性と拡張性を高めます。

## 背景 (Background)

現在のノートアプリは主にテキストベースのMarkdownファイルを扱っています。仕様書「2.1. ノート作成・編集機能」では、将来的にモジュール的に他のファイル形式の編集・表示に対応可能とすることが示されています。`FileEditor.tsx`には`FILE_VIEWERS`の定義がありますが、画像やPDFなどの非テキストファイルの表示ロジックはまだ実装されていません。アプリケーションの利用範囲を広げるために、この拡張性への対応が必要です。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `FileEditor`コンポーネントが、ファイル名に基づいて適切なビューアを動的に選択・レンダリングできるようなアーキテクチャを確立すること。
- [ ] 少なくとも1つの非テキストファイル形式（例: 画像ファイル）の表示機能を実装すること。
- [ ] 画像ファイルの場合、`FileEditor`のプレビューモードで画像が正しく表示されること。
- [ ] 新しいファイル形式を追加する際に、既存のコードに大きな変更を加えることなく容易に拡張できる設計であること。
- [ ] `FILE_VIEWERS`の定義が、各ファイル形式の`editable`プロパティを適切に制御できること。

## 関連ファイル (Related Files)

- `src/features/note-edit/components/FileEditor.tsx`
- `src/types/note.ts`
- `docs/specifications/requirements.md`

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
- **結果:**
- **メモ:**

---
