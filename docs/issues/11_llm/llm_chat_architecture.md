# LLM Chat Architecture Overview

このドキュメントは、フロントエンドからバックエンドのLLM（大規模言語モデル）へのチャットメッセージとコンテキストの流れを簡潔に説明します。

## 1. フロントエンドの役割

ユーザーのチャット入力と関連コンテキストを収集し、バックエンドに送信します。

*   **`app/features/chat/components/ChatInputBar.tsx`**: ユーザーがメッセージを入力するUI。
*   **`app/features/chat/hooks/useChat.ts`**: チャットメッセージと会話履歴を管理。
*   **`app/features/chat/index.ts` (ChatService)**: 画面固有のコンテキスト（例: 編集中のノート内容、ファイルリスト）を収集し、メッセージと会話履歴と統合。
*   **`app/services/llmService/index.ts`**: 最終的なペイロードを構築し、バックエンドの `/api/chat` エンドポイントに送信。

## 2. バックエンドの役割

フロントエンドから受け取ったメッセージとコンテキストをLLMエージェントで処理し、応答を生成します。

*   **`server/src/llm/routers/chat_router.py`**: `/api/chat` エンドポイントへのリクエストを受け取る。
*   **`server/src/llm/services/chat_service.py`**: LLMプロバイダー（例: OpenAI, Gemini）を選択し、LLMエージェントに処理を委譲。
*   **`server/src/llm/providers/base.py`**: LLMエージェントの基盤。システムプロンプト、会話履歴、コンテキスト、および利用可能なツールを統合してLLMに渡す。
*   **`server/src/llm/tools/file_tools.py`**: LLMエージェントが利用できるファイル操作ツール（`read_file`, `edit_file` など）を定義。

## 3. 送信されるコンテキストの種類

フロントエンドからバックエンドに送信される主要なコンテキストは以下の通りです。

*   **`message`**: ユーザーの現在のチャットメッセージ。
*   **`conversationHistory`**: 現在のチャットセッションの会話履歴。
*   **`currentFileContent`**: `NoteEditScreen` の場合にのみ、現在編集中のノートの全内容。
*   **`allFiles`**: `NoteListScreen` の場合に、プロジェクト内の全ファイルのパスのリスト。
*   **`activeScreen`**: 現在アクティブな画面（`NoteEditScreen` または `NoteListScreen`）を示す情報。

## 4. 現在の主要な制限

LLMエージェントが利用できる `read_file` ツールは、**現在開いているファイルの内容しか読み取ることができません。** `allFiles` に含まれる他のファイルのパスは参照できますが、その内容を読み取ってLLMが利用することはできません。これが、LLMのファイル操作能力を向上させる上での主要な課題です。
