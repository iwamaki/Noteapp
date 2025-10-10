---
title: "[A]_008_チャットコンポーネントの汎用化と動的な画面コンテキスト共有"
id: 8
status: new
priority: A:high
attempt_count: 0
tags: [UI, chat, refactoring, architecture]
---

## 概要 (Overview)

現在の `ChatInputBar` コンポーネントは、`NoteEditScreen` と `NoteListScreen` に直接組み込まれており、`ChatContext` をプロパティとして受け取ることで画面の情報を共有している。この設計は結合度が高く、チャット機能の再利用性や拡張性を阻害している。本Issueでは、`ChatInputBar` を画面から完全に独立させ、現在アクティブな画面のコンテンツ（例: ノートリストのタイトル、編集中のノートのタイトルと内容）を動的に、かつ疎結合な形でLLMと共有できる汎用的なチャット機能の設計と実装を行う。

## 背景 (Background)

現状のチャット機能は、`app/features/chat/ChatInputBar.tsx` が `app/screen/note-edit/NoteEditScreen.tsx` と `app/screen/note-list/NoteListScreen.tsx` の両方で直接インポートされ、`ChatContext` をプロパティとして渡すことで画面固有の情報をLLMに提供している。この方式は、チャット機能と各画面の間に強い依存関係を生み出しており、以下のような課題がある。
*   **再利用性の低さ**: `ChatInputBar` を他の画面や機能で利用しようとすると、その画面も `ChatContext` を準備する必要があり、実装が煩雑になる。
*   **拡張性の限界**: LLMに提供したい画面コンテキストの種類が増えるたびに、`ChatContext` の型定義や `ChatInputBar` のプロパティを修正する必要がある。
*   **結合度の高さ**: チャット機能が画面の内部実装に密接に結合しているため、どちらかの変更がもう一方に影響を与えやすい。
これらの課題を解決し、より柔軟でスケーラブルなチャット機能を実現するために、疎結合なデータ共有メカニズムへの移行が必要である。

## 実装方針 (Implementation Strategy)

1.  **グローバルな `ChatService` (または `ChatManager`) の導入**:
    *   `app/services/chatService/` ディレクトリを新規作成し、`index.ts` に `ChatService` クラスを定義する。
    *   `ChatService` はシングルトンとして機能し、アプリケーション全体でチャットの状態（メッセージ履歴、LLMとの通信ロジック、コマンド処理など）を一元的に管理する。
    *   `ChatInputBar` はこの `ChatService` と直接連携し、メッセージの送受信を行うように変更する。
    *   `ChatService` は、現在アクティブな「コンテキストプロバイダー」からの情報を取得する役割も担う。

2.  **`ActiveScreenContextProvider` インターフェースの定義**:
    *   `app/services/chatService/types.ts` に `ActiveScreenContext` と `ActiveScreenContextProvider` インターフェースを定義する。
    *   `ActiveScreenContext` は、LLMに共有したい画面固有の情報を保持する型とする。
        ```typescript
        interface ActiveScreenContext {
          currentNoteTitle?: string;
          currentNoteContent?: string;
          fileList?: { name: string; type: 'file' | 'directory' }[];
          // 必要に応じて、その他の画面固有の情報を追加
        }
        ```
    *   `ActiveScreenContextProvider` は、`ActiveScreenContext` を提供するメソッドと、LLMからのコマンドを処理するためのハンドラを登録するメソッドを持つインターフェースとする。
        ```typescript
        import { LLMCommand } from '../../services/llmService/types/types'; // 既存のLLMCommandを再利用

        interface ActiveScreenContextProvider {
          getScreenContext(): Promise<ActiveScreenContext>;
          registerCommandHandlers?(handlers: Record<string, (command: LLMCommand) => void | Promise<void>>): void;
        }
        ```

3.  **画面ごとの `ActiveScreenContextProvider` 実装**:
    *   `NoteEditScreen` と `NoteListScreen` のそれぞれに、`ActiveScreenContextProvider` インターフェースを実装したカスタムフック（例: `useNoteEditChatContext`, `useNoteListChatContext`）を導入する。
    *   これらのフックは、画面固有のデータ（`useNoteEditor` や `useNoteListLogic` から取得したデータ）を元に `ActiveScreenContext` を生成し、`getScreenContext` メソッドを通じて提供する。
    *   `NoteEditScreen` のフックは、`edit_file` や `read_file` といったLLMコマンドを処理するハンドラを `registerCommandHandlers` メソッドを通じて `ChatService` に登録する。

4.  **アクティブな `ActiveScreenContextProvider` の登録/解除メカニズム**:
    *   `ChatService` に、現在アクティブな `ActiveScreenContextProvider` を登録・解除するメソッド (`registerActiveContextProvider`, `unregisterActiveContextProvider`) を実装する。
    *   各画面のカスタムフック内で、`useEffect` を使用して、画面マウント時に自身の `ActiveScreenContextProvider` を `ChatService` に登録し、アンマウント時に解除する。これにより、`ChatService` は常に現在アクティブな画面のコンテキストプロバイダーを把握できる。

5.  **`ChatInputBar` からのコンテキスト取得とLLM連携の抽象化**:
    *   `ChatInputBar` は、`ChatService` のメソッド（例: `sendMessage(message: string)`）を呼び出すように変更する。
    *   `ChatService` は、メッセージ送信時やLLMへの問い合わせ時に、現在アクティブな `ActiveScreenContextProvider` の `getScreenContext()` を呼び出し、最新の画面コンテンツを取得する。
    *   取得した画面コンテキストとユーザーメッセージを組み合わせてLLMに送信するロジックは `ChatService` 内にカプセル化する。
    *   LLMからの応答に含まれるコマンドは、`ChatService` が現在登録されている `ActiveScreenContextProvider` の `registerCommandHandlers` で登録されたハンドラにディスパッチする。

6.  **`ChatInputBar` のプロパティ変更**:
    *   `ChatInputBar` から `context`, `onCommandReceived`, `currentNoteTitle`, `currentNoteContent`, `onSendMessageRef` プロパティを削除し、`ChatService` を介した通信に一本化する。

## 受け入れ条件 (Acceptance Criteria)

*   [ ] `app/services/chatService/` ディレクトリが新規作成され、`ChatService` クラスが定義されていること。
*   [ ] `app/services/chatService/types.ts` に `ActiveScreenContext` および `ActiveScreenContextProvider` インターフェースが定義されていること。
*   [ ] `ChatInputBar.tsx` が `ChatService` を介してメッセージの送受信を行うように変更され、画面固有のプロパティ（`context` など）が削除されていること。
*   [ ] `NoteEditScreen.tsx` および `NoteListScreen.tsx` が、それぞれ `ActiveScreenContextProvider` を実装したカスタムフック（例: `useNoteEditChatContext`, `useNoteListChatContext`）を導入し、`ChatService` に登録・解除していること。
*   [ ] `NoteEditScreen` における `edit_file` および `read_file` コマンドの処理が、`ChatService` を介して適切にディスパッチされること。
*   [ ] `NoteListScreen` が、リストに表示されているノートのタイトルを `ActiveScreenContext` として `ChatService` に提供できること。
*   [ ] アプリケーションの既存のチャット機能が、この変更後も期待通りに動作すること。
*   [ ] 新しい設計により、`ChatInputBar` が他の画面でも容易に再利用できる状態になっていること。

## 関連ファイル (Related Files)

*   `app/features/chat/ChatInputBar.tsx`
*   `app/screen/note-edit/NoteEditScreen.tsx`
*   `app/screen/note-edit/hooks/useNoteEditor.tsx` (コンテンツ取得のため)
*   `app/screen/note-list/NoteListScreen.tsx`
*   `app/screen/note-list/hooks/useNoteListLogic.tsx` (コンテンツ取得のため)
*   `app/services/llmService/types/types.ts` (既存のLLMCommand型を再利用)
*   `app/navigation/RootNavigator.tsx` (必要に応じて、ChatServiceの初期化など)
*   新規作成: `app/services/chatService/index.ts`
*   新規作成: `app/services/chatService/types.ts`

## 制約条件 (Constraints)

*   既存のUI/UXを大きく変更しないこと。
*   パフォーマンスに悪影響を与えないこと。
*   `AsyncStorage` を直接操作するロジックは、`ChatService` 内には含めず、既存のストレージサービスを利用すること。
*   LLMとの通信ロジックは、既存の `llmService` を活用すること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---

## AIへの申し送り事項 (Handover to AI)

*   **現在の状況**: ユーザーとの対話を通じて、チャットコンポーネントの汎用化と動的な画面コンテキスト共有の必要性が明確になり、そのための理想的な設計案が合意されました。
*   **次のアクション**: 上記の「実装方針」に基づき、`ChatService` の新規作成、`ActiveScreenContextProvider` インターフェースの定義、および既存の `ChatInputBar`、`NoteEditScreen`、`NoteListScreen` の改修に着手してください。
*   **考慮事項/ヒント**:
    *   まずは `app/services/chatService/` ディレクトリと基本となる `ChatService` クラス、`types.ts` の定義から始めるのが良いでしょう。
    *   `ChatService` 内で `ActiveScreenContextProvider` の登録・解除を管理するためのシンプルなメカニズム（例: `currentProvider: ActiveScreenContextProvider | null`）を実装してください。
    *   `ChatInputBar` の `useChat` フックも `ChatService` を利用するように変更する必要があります。
    *   `NoteEditScreen` と `NoteListScreen` のカスタムフックは、`useEffect` を使って `ChatService` への登録・解除を行うようにしてください。
