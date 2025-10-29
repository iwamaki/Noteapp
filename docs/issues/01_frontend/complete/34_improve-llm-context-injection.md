title: "LLMへのコンテキスト注入方法を改善し、UIから制御可能にする"
id: 34
status: in-progress
priority: high
attempt_count: 2
tags: [LLM, prompt, UI, backend, frontend]
---

## 概要 (Overview)

LLMへのプロンプトに意図せずファイル内容が混入し、応答品質を低下させている問題を解決する。具体的には、ファイル内容の自動コンテキスト注入を廃止し、ユーザーがフロントエンドのUIから明示的に現在のノート内容をプロンプトに添付できる機能を実装する。

## 背景 (Background)

現状、バックエンドの実装 (`openai.py`) では、ユーザーからのメッセージに加え、現在開いているファイルの内容が自動的にプロンプトに追加されている。これにより、ユーザーの意図とは無関係な大量のコンテキストがLLMに渡ってしまい、応答が混乱し精度が低下する原因となっている。

この問題を解決し、ユーザーがコンテキストを能動的にコントロールできるようにすることで、LLMの応答精度と利用体験を向上させることを目的とする。

## 受け入れ条件 (Acceptance Criteria)

- [ ] `server/src/llm_providers/openai.py` から、ファイル内容を自動でプロンプトに追加するロジックが削除されている。
- [ ] チャット入力UI (`ChatInputBar.tsx` など) に、現在のノート内容をプロンプトに添付するためのボタンが追加されている。
- [ ] 添付ボタンが押された場合のみ、ノートの内容がバックエンドに送信され、LLMへのプロンプトに含まれる。
- [ ] 添付ボタンが押されない場合は、ノートの内容はプロンプトに含まれない。

## 関連ファイル (Related Files)

- `server/src/llm_providers/openai.py`
- `app/features/chat/ChatInputBar.tsx`
- `app/features/chat/hooks/useChat.ts`
- `app/services/llmService.ts`
- `server/src/models.py`
- `app/features/note-edit/NoteEditScreen.tsx`

## 制約条件 (Constraints)

- 既存のフロントエンドの状態管理（Zustand）とバックエンドのサービス構造を尊重すること。
- UIの変更は、既存のデザインシステムと一貫性を保つこと。

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:** 3段階の計画（①自動コンテキスト注入の削除、②UIからの明示的なコンテキスト添付機能の実装、③バックエンドでの選択的処理）に基づき、フロントエンドとバックエンド双方のコードを修正した。
  - **Backend:** `openai.py` のプロンプト生成ロジックを修正し、`models.py` のデータモデルを更新した。
  - **Frontend:** `ChatInputBar.tsx` にノート添付ボタンを追加し、`useChat.ts` で状態に応じたコンテキスト構築ロジックを実装。関連する型定義 (`llmService.ts`) も更新した。
- **結果:** 成功。
  - 計画した機能はすべて実装完了。途中で発生したTypeScriptの型エラーは、`noteDraftStore` のデータ構造を調査することで解決し、最終的に `npm run type-check` は正常に完了した。
- **メモ:** 一次実装は完了。しかし、`[+ Note]` をONにした際のAIの応答が、本当にファイル内容を読んでいるか不明確である、とユーザーからフィードバックあり。応答品質の検証と、必要であればデバッグが必要。

---
### 試行 #2

- **試みたこと:** `[+ Note]` がONでもファイル内容が送信されない問題の調査。
  1. バックエンドのAPIエンドポイント(`routers/chat.py`)にデバッグログを追加し、フロントエンドから送信される`context`オブジェクトの内容を直接確認。
  2. ログから、`attachedFileContent`が`null`である一方、意図しない`currentFileContent`にデータが含まれていることを発見。
  3. `currentFileContent`を生成している箇所を特定するため、`useLLMCommandHandler.ts` -> `ChatInputBar.tsx` -> `NoteEditScreen.tsx`とコードを追跡。
  4. `NoteEditScreen.tsx`が`currentFileContent`をハードコードで生成している根本原因を特定し、該当部分を削除。
- **結果:** 根本原因の特定と修正に成功。
  - `NoteEditScreen.tsx`の修正により、`useChat.ts`は追加修正なしで期待通りの動作をするはず、と判断した。
- **メモ:** 修正後に再テストを実施。`[+ Note]`がOFFの場合は期待通り動作。しかし、ユーザーからの報告によると、`[+ Note]`がONの場合でも`attachedFileContent`が`null`のままであり、問題は未解決。UIの状態とロジックに渡される値の間に不整合があると推測。次の手として、`ChatInputBar.tsx`の送信ハンドラに直接ログを仕込み、UIの状態を送信直前に確認する計画。

---