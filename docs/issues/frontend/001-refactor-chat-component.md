---
title: "[medium]_[001]_[チャット機能の疎結合化とLLM連携強化]"
id: 1
status: new
priority: medium
attempt_count: 0
tags: [UI, chat, LLM, refactoring, context]
---

## 概要 (Overview)

> チャット機能を特定の画面から疎結合化し、アプリケーション全体で利用可能なオーバーレイUIとして再構築します。これにより、LLMが現在アクティブな画面のコンテキストデータ（ノートリスト情報、編集中のノートのタイトルと内容など）にアクセスできるようになり、LLMによるファイル操作（読み込み、編集、作成、削除、Web検索など）を可能にします。

## 背景 (Background)

> 現在、チャット機能はNoteListScreenとNoteEditScreenに深く結合されており、ChatInputBarが各画面内で直接レンダリングされています。また、キーボード表示時のレイアウト調整ロジックやCHAT_INPUT_HEIGHTのような定数が各画面に分散しており、実装の重複と密結合が生じています。
>
> この現状は以下の課題を抱えています：
> - チャット機能の再利用性が低い。
> - 画面遷移時のチャット状態管理が複雑になる。
> - LLMが画面横断的にコンテキストを把握し、より高度な操作を行うことが困難。
>
> 本issueは、チャット機能を独立したグローバルなコンポーネントとして再構築し、LLMがアクティブな画面のコンテキストを動的に取得・利用できる仕組みを確立することで、これらの課題を解決し、より柔軟で強力なLLM連携を実現することを目的とします。

## 実装方針 (Implementation Strategy)

> 1.  **グローバルチャットUIの配置:**
>     - `ChatInputBar`および関連するチャットUI（`ChatHistory`など）を`RootNavigator.tsx`の最上位の`View`内に移動させ、アプリケーション全体にわたるオーバーレイとして機能させます。
>     - `position: 'absolute'`などのスタイルを用いて、他のコンテンツの上にフロートするように配置します。
> 2.  **グローバルなキーボードハンドリング:**
>     - 現在`ChatInputBar.tsx`と`NoteEditScreen.tsx`に分散しているキーボードイベントリスナーを、`RootNavigator.tsx`または`App.tsx`のような上位コンポーネントに集約します。
>     - キーボードの高さをグローバルな状態（例: React ContextやZustandストア）として管理し、各画面がこのグローバルなキーボード高さを購読して自身のコンテンツのパディングを動的に調整できるようにします。
> 3.  **`CHAT_INPUT_HEIGHT`の集約:**
>     - `CHAT_INPUT_HEIGHT`のようなチャットUIの高さに関する定数を、`app/design/constants.ts`のような新しい共通ファイルに定義し、一元管理します。
> 4.  **`ChatService`と`ActiveScreenContextProvider`の活用:**
>     - `useNoteEditChatContext`と`useNoteListChatContext`は、引き続き画面固有のデータを`ChatService`に提供します。
>     - `ChatService`は、`ActiveScreenContextProvider`を通じて取得したアクティブな画面のコンテキスト（`NoteListScreen`からはノートのリスト情報、`NoteEditScreen`からは編集中のノートのタイトルと内容の要約など）をLLMへのプロンプトに含めます。
>     - LLMは、このコンテキスト情報と、`LLMCommand`の仕組みを利用して、ファイル操作（読み込み、編集、作成、削除）やWeb検索などの具体的なアクションを指示します。
> 5.  **画面側の調整:**
>     - `NoteEditScreen.tsx`と`NoteListScreen.tsx`から`ChatInputBar`のレンダリングを削除します。
>     - 両画面は、グローバルなキーボード高さとチャットUIの高さに基づいて、自身のコンテンツ（`FileEditor`や`FlatList`）の`paddingBottom`を調整するように変更します。

## 受け入れ条件 (Acceptance Criteria)

> - [ ] チャットUI（`ChatInputBar`および`ChatHistory`）が、アプリケーションのどの画面にいても常にオーバーレイとして表示されること。
> - [ ] キーボードが表示された際に、チャットUIおよびアクティブな画面のコンテンツが適切にレイアウト調整され、隠れないこと。
> - [ ] `NoteListScreen`および`NoteEditScreen`から`ChatInputBar`の直接的なインポートとレンダリングが削除されていること。
> - [ ] `CHAT_INPUT_HEIGHT`のようなチャットUIの高さに関する定数が一元管理されていること。
> - [ ] `NoteListScreen`が表示されている状態でチャットにメッセージを送信すると、LLMがノートリストのコンテキスト（例: ノートのタイトル一覧）を認識し、それに基づいた応答やコマンドを生成できること。
> - [ ] `NoteEditScreen`が表示されている状態でチャットにメッセージを送信すると、LLMが編集中のノートのタイトルと内容のコンテキストを認識し、それに基づいた応答やコマンドを生成できること。
> - [ ] LLMが`edit_file`コマンドを生成した場合、`NoteEditScreen`のコンテンツがLLMの指示通りに更新されること。
> - [ ] LLMが`read_file`コマンドを生成した場合、`ChatService`が適切に処理し、LLMにファイル内容を提供できること。
> - [ ] LLMがファイル作成、削除、コピー、Web検索などのコマンドを生成した場合、`ChatService`がそれらを処理し、適切なフィードバックをユーザーに提供できること（具体的なコマンドハンドラの実装は別途issueで対応する可能性あり）。
> - [ ] 既存のナビゲーション、画面表示、チャット機能のコアロジック（メッセージ送受信、履歴表示など）が正常に動作すること。

## 関連ファイル (Related Files)

> - `app/App.tsx`
> - `app/navigation/RootNavigator.tsx`
> - `app/features/chat/ChatInputBar.tsx`
> - `app/features/chat/hooks/useChat.ts`
> - `app/features/chat/components/ChatHistory.tsx` (必要に応じて)
> - `app/screen/note-edit/NoteEditScreen.tsx`
> - `app/screen/note-edit/hooks/useNoteEditChatContext.ts`
> - `app/screen/note-list/NoteListScreen.tsx`
> - `app/screen/note-list/hooks/useNoteListChatContext.ts`
> - `app/services/chatService/index.ts`
> - `app/services/chatService/types.ts`
> - `app/services/llmService/types/types.ts`
> - `app/components/MainContainer.tsx`
> - `app/design/theme/ThemeContext.tsx` (または新しい定数ファイル)
> - `app/design/constants.ts` (新規作成の可能性あり)

## 制約条件 (Constraints)

> - 既存のUI/UXを大きく損なわないこと。
> - アプリケーションのパフォーマンスに悪影響を与えないこと。
> - 既存の`ChatService`および`ActiveScreenContextProvider`の設計思想を維持し、拡張すること。
> - LLMとの連携は、既存の`APIService`を通じて行うこと。
> - React Nativeの標準的なコンポーネントとAPIを使用すること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---

## AIへの申し送り事項 (Handover to AI)

> - **現在の状況:** チャット機能の疎結合化とLLM連携強化に関する議論が完了し、実装方針が確立されました。関連ファイルの分析も完了しています。
> - **次のアクション:** 上記の「実装方針」と「受け入れ条件」に基づき、コードの変更を開始してください。まず、`RootNavigator.tsx`にグローバルなチャットUIを配置し、キーボードハンドリングをグローバル化する作業から着手するのが良いでしょう。
> - **考慮事項/ヒント:**
>   - `RootNavigator.tsx`の`View`コンポーネントが、グローバルなチャットUIをオーバーレイとして配置するのに最適な場所です。
>   - キーボードの高さは、`Keyboard`モジュールのイベントリスナーを使用して取得し、React Contextなどでグローバルに提供することを検討してください。
>   - `CHAT_INPUT_HEIGHT`は`app/design/constants.ts`のような新しいファイルに定義し、各画面やチャットUIから参照するように変更してください。
>   - `NoteEditScreen.tsx`と`NoteListScreen.tsx`の`paddingBottom`調整ロジックは、グローバルなキーボード高さとチャットUIの高さに基づいて動的に計算されるように修正が必要です。
>   - `useNoteEditChatContext.ts`と`useNoteListChatContext.ts`は、`ChatService`へのコンテキスト登録ロジックを維持しつつ、必要に応じてLLMが利用するコンテキスト情報の粒度（例: ノート内容の要約）を調整することを検討してください。

---