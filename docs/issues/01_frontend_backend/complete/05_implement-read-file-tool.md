---
title: "B_005_implement-read-file-tool"
id: 005
status: completed
priority: medium
attempt_count: 2
tags: [backend, tool, LLM, frontend]
---

## 概要 (Overview)

> LLMがファイルの内容を読み取ることができる`read_file`ツールをバックエンドに実装します。これにより、LLMはファイルの内容を理解し、より高度なタスクを実行できるようになります。
> 今後の拡張性を考慮した、実装を実現することで、`read_file`以外のツールを追加可能にしやすくなります。

## 背景 (Background)

> 現在、LLMは`edit_file`ツールを通じてファイルの内容を編集する意図を伝えることができますが、ファイルの内容を直接読み取る機能がありません。`edit_file`の実装パターンを参考に、`read_file`ツールを導入することで、LLMがファイルの内容を分析し、その情報に基づいて適切なアクションを提案できるようになります。これは、今後のLLMによるコード分析やドキュメント参照機能の基盤となります。

## 実装方針 (Implementation Strategy)

### アーキテクチャ概要

現在の実装は、**LLMがツールを呼び出すと「意図」だけをフロントエンドに返し、フロントエンド側で実際の操作を行う**というクリーンな設計になっています。これにより以下の利点があります：

1. **セキュリティ**: バックエンドがファイルシステムに直接アクセスしない
2. **柔軟性**: フロントエンドが自由にファイル操作をハンドリングできる
3. **拡張性**: 新しいツールの追加が容易

### データフロー（現状の`edit_file`パターン）

```
1. フロント: ユーザーがチャットでメッセージ送信
   ↓ (useChat.ts:113-146)
2. フロント: APIService.sendChatMessage() → バックエンドへHTTPリクエスト
   ↓
3. バック: GeminiProvider/OpenAIProvider が AVAILABLE_TOOLS を bind
   ↓ (gemini.py:25, openai.py:25)
4. バック: LLMが tool_calls でツール使用を示す
   ↓ (_extract_tool_calls: gemini.py:96-113, openai.py:92-109)
5. バック: LLMCommand オブジェクトに変換して返却
   ↓
6. フロント: ChatInputBar → onCommandReceived コールバック
   ↓ (ChatInputBar.tsx:18-25, NoteEditScreen.tsx:99-106)
7. フロント: NoteEditScreenで command.action を判定して実際の操作実行
```

### `read_file`実装の戦略

**重要な設計判断: バックエンドからフロントエンドにfetchしてファイルを取得するか？**

**答え: NO - 既存パターンに従い、フロント側でファイルを読み込む**

理由:
- 現状の`edit_file`では、フロント側に既にファイル内容がある（NoteEditScreen）
- React Nativeアプリではフロント側でファイルシステムアクセスが可能
- バックエンドは「LLMの意図」を伝達する役割に専念すべき
- セキュリティ面でもフロント制御が望ましい

### 実装ステップ

#### 1. バックエンド: `read_file`ツールの定義（file_tools.py）

```python
@tool
def read_file(filename: str) -> str:
    """
    ファイルの内容を読み取ります。

    Args:
        filename: 読み取るファイルのパス（例: "note.txt"）

    Returns:
        読み取りが必要であることを示すメッセージ
    """
    return f"ファイル '{filename}' の読み取りコマンドを生成しました。"
```

**AVAILABLE_TOOLSに追加**:
```python
AVAILABLE_TOOLS = [edit_file, read_file]
```

#### 2. バックエンド: 各プロバイダーの`_extract_tool_calls`に`read_file`処理を追加

**gemini.py と openai.py** の `_extract_tool_calls` メソッドに以下を追加:
```python
elif tool_call.get('name') == 'read_file':
    args = tool_call.get('args', {})
    commands.append(LLMCommand(
        action='read_file',
        path=args.get('filename')
    ))
```

#### 3. フロントエンド: コマンドハンドラーの拡張

**NoteEditScreen.tsx** の `handleCommandReceived` に処理を追加:
```typescript
if (command.action === 'read_file' && command.path) {
  // ファイル読み込みロジック
  // 例: 現在のノート内容をLLMに返す、または他のファイルを読み込む
  // 実装は要件次第（例: Alert表示、別画面遷移、etc.）
}
```

#### 4. フロントエンド: 拡張性を考慮した設計

**将来のツール追加に備えて、コマンドハンドラーをリファクタリング**:

```typescript
// コマンドハンドラーマップパターン（推奨）
const commandHandlers: Record<string, (command: LLMCommand) => void> = {
  'edit_file': handleEditFile,
  'read_file': handleReadFile,
  // 将来的に追加しやすい
};

const handleCommandReceived = (commands: LLMCommand[]) => {
  for (const command of commands) {
    const handler = commandHandlers[command.action];
    if (handler) {
      handler(command);
    }
  }
};
```

### 拡張性の担保

**ツール追加時の変更箇所**:
1. `server/src/tools/file_tools.py` - 新しい`@tool`デコレータ関数を追加
2. `server/src/llm_providers/gemini.py` - `_extract_tool_calls`に処理追加
3. `server/src/llm_providers/openai.py` - `_extract_tool_calls`に処理追加
4. `app/screen/note-edit/NoteEditScreen.tsx` - コマンドハンドラーに処理追加
5. `app/services/llmService/utils/CommandValidator.ts` - 必要に応じてALLOWED_ACTIONSに追加（read_fileは既に存在）

**今後の改善案**:
- プロバイダー間の重複コードを`BaseLLMProvider`に共通化
- フロント側のコマンドハンドラーをプラグイン式に変更
- ツール定義をJSON/YAMLで一元管理し、自動生成する仕組み

## 受け入れ条件 (Acceptance Criteria)

このissueが「完了」と見なされるための具体的な条件をチェックリスト形式で記述します。

### バックエンド実装
- [ ] `server/src/tools/file_tools.py`に`read_file`ツールが定義されている
- [ ] `AVAILABLE_TOOLS`リストに`read_file`が追加されている
- [ ] `server/src/llm_providers/gemini.py`の`_extract_tool_calls`で`read_file`が処理される
- [ ] `server/src/llm_providers/openai.py`の`_extract_tool_calls`で`read_file`が処理される

### フロントエンド実装
- [ ] `app/screen/note-edit/NoteEditScreen.tsx`の`handleCommandReceived`で`read_file`コマンドが処理される
- [ ] `read_file`コマンド受信時に適切なファイル読み込み処理が実行される
- [ ] （推奨）コマンドハンドラーがマップパターンにリファクタリングされ、拡張性が向上している

### セキュリティ
- [ ] `CommandValidator.ts`のパス検証が機能している（`..`などの不正パスを拒否）
- [ ] `read_file`が`ALLOWED_ACTIONS`に含まれている（既に存在）

### テスト・動作確認
- [ ] LLMに「このファイルの内容を読み取って」と依頼すると、`read_file`ツールが呼び出される
- [ ] `read_file`コマンドがフロントエンドに正しく伝達される
- [ ] フロントエンドでファイル内容が適切に処理される（UIに表示、または次のアクションに利用）
- [ ] 既存の`edit_file`機能が正常に動作し続ける（デグレードがない）

### ドキュメント
- [ ] このissueの「開発ログ」セクションに実装結果が記録される
- [ ] 必要に応じてREADMEやコメントが更新される
## 関連ファイル (Related Files)

> - `server/src/tools/file_tools.py`
> - `server/src/llm_providers/gemini.py`
> - `server/src/llm_providers/openai.py`
> - `app/services/llmService/utils/CommandValidator.ts`

**コメント**
- まだこれ以外にもあると思います。


## 制約条件 (Constraints)

> - 既存の`edit_file`ツールの実装パターンに準拠し、一貫性のある設計とすること。
> - 将来的なツール追加の拡張性を考慮した設計とすること。
> - `read_file`はテキストファイルの内容読み込みに限定し、バイナリファイル（画像、PDFなど）は対象外とする。
> - セキュリティを考慮し、指定されたパス以外のファイルへのアクセスは許可しないこと。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
  - `read_file`ツールのバックエンド実装（`file_tools.py`、`gemini.py`、`openai.py`）
  - フロントエンドのコマンドハンドラーを拡張性の高いマップパターンにリファクタリング
  - `read_file`コマンドハンドラーの実装（`NoteEditScreen.tsx`）

- **結果:**
  - ✅ バックエンド: `read_file`ツールを`AVAILABLE_TOOLS`に追加完了
  - ✅ バックエンド: GeminiとOpenAIの両プロバイダーで`read_file`のツールコール抽出処理を実装
  - ✅ フロントエンド: コマンドハンドラーをif-else連鎖からマップパターンにリファクタリング
  - ✅ フロントエンド: `read_file`ハンドラーを実装（現状はログ出力、将来の拡張に備えたコメント付き）

- **メモ:**
  - 既存の`edit_file`パターンに完全に準拠した実装
  - 拡張性が大幅に向上: 新しいツール追加時は`commandHandlers`マップに1行追加するだけ
  - `CommandValidator.ts`には既に`read_file`が含まれていたため、バリデーション修正は不要
  - セキュリティ: パス検証は既存の`CommandValidator`で実施済み
  - 今後の改善提案:
    - プロバイダー間の`_extract_tool_calls`の共通化（`BaseLLMProvider`へ移行）
    - `read_file`の実用的な機能実装（他ファイルの読み込み、UIへの表示など）

- **実装されたファイル:**
  1. `server/src/tools/file_tools.py` - `read_file`ツール定義とAVAILABLE_TOOLSへの追加
  2. `server/src/llm_providers/gemini.py` - `_extract_tool_calls`に`read_file`処理追加（L112-117）
  3. `server/src/llm_providers/openai.py` - `_extract_tool_calls`に`read_file`処理追加（L108-113）
  4. `app/screen/note-edit/NoteEditScreen.tsx` - コマンドハンドラーマップパターンへのリファクタリング + `read_file`ハンドラー実装（L99-138）

- **テスト手順:**
  1. バックエンドサーバーを起動
  2. アプリでノート編集画面を開く
  3. チャットで「このファイルの内容を読み取って」と依頼
  4. LLMが`read_file`ツールを呼び出し、フロントエンドでログが出力されることを確認

---
### 試行 #2

- **試みたこと:**
  - **重大な問題を発見**: 試行#1の実装では、LLMが`read_file`を呼び出してもファイル内容が返されず、LLMは何度も`read_file`を呼び続ける無限ループに陥っていた
  - **根本原因の分析**: `edit_file`は一方向のコマンド（LLM → フロント）だが、`read_file`は双方向のやり取り（LLM → フロント → **LLM**）が必要
  - **解決策の実装**: フロントエンドで`read_file`コマンドを受け取ったら、ファイル内容を自動的にLLMに送り返すメカニズムを実装

- **結果:**
  - ✅ `ChatInputBar`に`onSendMessageRef`プロパティを追加し、`sendMessage`関数を親コンポーネントに公開
  - ✅ `NoteEditScreen`で`sendMessageFnRef`を使って`sendMessage`関数への参照を保持
  - ✅ `handleReadFile`を非同期関数に変更し、ファイル内容を読み込んだら自動的に`sendMessage`を呼び出してLLMに送信
  - ✅ `handleCommandReceived`を非同期対応に変更し、`read_file`の自動応答を待つ
  - ✅ ファイル内容は`[ファイル「{filename}」の内容]\n---\n{content}\n---`という形式でLLMに送信される

- **メモ:**
  - **重要**: `read_file`は`edit_file`と異なり、「ツール応答」が必要なツール
  - LLMがツールを呼び出したら、フロントエンドはツールの実行結果を自動的にLLMに返す必要がある
  - 今回の実装で、LLMは以下の流れでファイル内容を取得できるようになった：
    1. ユーザー: 「このファイルの内容を読み取って」
    2. LLM: `read_file`ツールを呼び出し
    3. フロント: ファイル内容を読み込み、自動的にLLMに送信
    4. LLM: ファイル内容を受け取り、ユーザーの質問に回答
  - 将来的には、バックエンド側で「ツール応答を待つ」メカニズムを実装することも検討すべき（LangChainのAgentExecutorパターン）

- **実装されたファイル:**
  1. `app/features/chat/ChatInputBar.tsx` - `onSendMessageRef`プロパティ追加、`sendMessage`関数の公開（L29, L38, L54-58）
  2. `app/screen/note-edit/NoteEditScreen.tsx` - `sendMessageFnRef`の追加、`handleReadFile`の非同期化とファイル内容の自動送信、`handleCommandReceived`の非同期対応（L45, L108-129, L140-149, L189）

- **テスト手順:**
  1. バックエンドサーバーを起動
  2. アプリでノート編集画面を開き、ノートに内容を入力（例: "1+1は？"）
  3. チャットで「このファイルの内容を読み取って」と依頼
  4. LLMが`read_file`ツールを呼び出す
  5. フロントエンドが自動的にファイル内容をLLMに送信する（ログに表示）
  6. LLMがファイル内容を受け取り、内容を教えてくれることを確認
  7. 「答えを教えてください」など追加質問すると、LLMがファイル内容を理解した上で回答できることを確認

---

## AIへの申し送り事項 (Handover to AI)

> **現在の状況:**
> - 既存の`edit_file`実装パターンを詳細に分析しました
> - 現在のアーキテクチャは「LLMが意図を示し、フロントが実行する」というクリーンな設計です
> - `CommandValidator.ts`には既に`read_file`が`ALLOWED_ACTIONS`に含まれています
> - データフローは: ユーザー入力 → バックエンド(LLM) → tool_calls抽出 → フロント処理、という流れです
>
> **次のアクション:**
> 1. まず`server/src/tools/file_tools.py`に`read_file`ツールを追加
> 2. 次に`gemini.py`と`openai.py`の`_extract_tool_calls`に処理を追加
> 3. フロント側の`NoteEditScreen.tsx`に`read_file`ハンドラーを実装
> 4. （推奨）コマンドハンドラーをマップパターンにリファクタリング
>
> **重要な設計判断:**
> - **バックエンドはファイルを読まない** - LLMの意図を伝えるだけ
> - **フロントエンドでファイル読み込みを実行** - 既存の`edit_file`パターンと同じ
> - **fetchでバックエンドからファイル取得する必要はない** - React Native側でファイルアクセス可能
>
> **拡張性のポイント:**
> - 新ツール追加時は5つのファイルを修正（file_tools.py, gemini.py, openai.py, NoteEditScreen.tsx, CommandValidator.ts）
> - 今後はプロバイダー間の共通処理を`BaseLLMProvider`に移行することを検討
> - フロント側のハンドラーマップパターン採用で、新ツール追加が容易に
>
> **考慮事項/ヒント:**
> - `edit_file`は実際にファイルを書き込まず、`setContent()`でReactの状態を更新しているだけ（NoteEditScreen.tsx:103）
> - `read_file`の実装も同様に、「ファイルを読み込んだ内容をLLMに返す」などの意図を実現する形で設計すべき
> - セキュリティ: `CommandValidator.ts:39-42`でパス検証が実施されている（`..`を拒否）
