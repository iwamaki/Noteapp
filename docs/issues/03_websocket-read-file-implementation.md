---
filename: 03_websocket-read-file-implementation
id: 3
status: in-progress
priority: high
attempt_count: 1
tags: [websocket, llm, backend, frontend, read_file]
---

## 概要 (Overview)

LLMの`read_file`ツールがファイル内容を動的に取得できるよう、WebSocketベースの双方向通信を実装しました。バックエンドとフロントエンドの実装は完了しましたが、動作確認とエラー修正が必要です。

## 背景 (Background)

従来、LLMに全ファイルの内容を事前送信していましたが、これは非効率的でスケールしない問題がありました。Claude CodeなどのAIエージェントと同様に、LLMが必要なファイルだけを動的に取得する仕組みを実装しました。

## 実装方針 (Implementation Strategy)

### アーキテクチャ
```
User → Frontend → Backend HTTP (/api/chat + client_id)
                      ↓
                  LLM Agent → read_file("ファイル名")
                      ↓
                  Backend WebSocket → Frontend: fetch_file_content
                      ↓
                  Frontend: Expo FileSystemから読み取り
                      ↓
                  Frontend WebSocket → Backend: file_content_response
                      ↓
                  LLM: 内容を理解して処理続行
```

### 完了した実装

#### バックエンド (コミット: 8a171e7)
- ✅ `server/src/api/websocket.py`: ConnectionManagerクラス
- ✅ `server/src/main.py`: WebSocketエンドポイント `/ws/{client_id}`
- ✅ `server/src/llm/tools/read_file.py`: async化、WebSocket対応
- ✅ `server/src/llm/tools/context_manager.py`: client_id管理
- ✅ `server/src/llm/models.py`: ChatRequestにclient_id追加

#### フロントエンド (コミット: 5628702)
- ✅ `app/features/chat/services/websocketService.ts`: WebSocketクライアント
- ✅ `app/features/chat/utils/clientId.ts`: client_id生成・永続化
- ✅ `app/features/chat/index.ts`: ChatServiceにWebSocket統合
- ✅ `app/features/chat/llmService/index.ts`: client_id送信
- ✅ `app/initialization/tasks/initializeWebSocket.ts`: 初期化タスク

## 受け入れ条件 (Acceptance Criteria)

- [x] バックエンドWebSocket実装完了
- [x] フロントエンドWebSocket実装完了
- [ ] アプリ起動時にWebSocket接続が確立される
- [ ] LLMがread_fileツールを呼び出すとWebSocket経由でファイル内容を取得できる
- [ ] ファイルリスト画面で「○○を読んで」と言うとファイル内容が取得できる
- [ ] エラーハンドリングが正しく動作する（ファイル未検出、タイムアウト等）
- [ ] WebSocket切断時に自動再接続する

## 開発ログ (Development Log)

---
### 試行 #1 (前セッション)

- **試みたこと:**
  - バックエンドWebSocket実装（ConnectionManager、エンドポイント、read_file async化）
  - フロントエンドWebSocket実装（WebSocketService、client_id管理、初期化タスク）
  - 2つのコミット完了（8a171e7, 5628702）

- **結果:**
  - 実装は完了したが、動作確認前にエラーが発生している
  - コンテキスト容量が限界に達したためセッション終了

- **メモ:**
  - 実装は完了しているが、テストが必要
  - 型エラーやインポートエラーの可能性がある

---
### 試行 #2 (このセッション)

- **試みたこと:**
  - TypeScript型エラーの修正（LogCategoryに`websocket`と`clientId`を追加）
  - Python ruffエラーの修正（未使用インポートの削除）
  - Python mypy型エラーの修正（型アノテーションの追加）
  - Dockerコンテナ内でのエラー確認

- **結果:**
  - ✅ TypeScriptの型チェックが全てパス
  - ✅ Python ruffのlintチェックが全てパス
  - ✅ Python mypyの型チェックが全てパス（noteは警告のみ）
  - ✅ Dockerコンテナが正常に起動している

- **修正したファイル:**
  - `app/utils/logger.ts:4` - LogCategory型に`websocket`と`clientId`を追加
  - `server/src/api/websocket.py:5-9` - 未使用インポート削除（WebSocketDisconnect, json）
  - `server/src/llm/tools/read_file.py:1,80-81` - 型アノテーション追加（cast使用）

- **メモ:**
  - 全ての型エラーとlintエラーが修正完了
  - 次は実機/シミュレータでの動作確認が必要

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- ✅ バックエンド・フロントエンドのWebSocket実装完了
- ✅ TypeScript型エラー修正完了
- ✅ Python lint/型エラー修正完了
- ✅ Dockerコンテナ正常起動中
- ⚠️ まだ実機・シミュレータでのテストは未実施

### 次のアクション（優先順位順）

1. ~~**エラー修正**~~ ✅ 完了
   - ~~TypeScriptの型エラーをチェック~~ ✅
   - ~~インポートエラーをチェック~~ ✅
   - ~~バックエンドの構文エラーをチェック~~ ✅

2. ~~**バックエンド起動確認**~~ ✅ 完了
   ```bash
   cd server
   docker-compose up
   ```
   - サーバーが起動するか確認
   - WebSocketエンドポイントが登録されているか確認

3. **フロントエンド起動確認**
   ```bash
   cd app
   npm start
   ```
   - ビルドエラーがないか確認
   - WebSocket初期化タスクが実行されるか確認

4. **WebSocket接続テスト**
   - アプリ起動時のログで `[initializeWebSocket] WebSocket initialized` を確認
   - client_idが生成されているか確認

5. **read_fileツール動作テスト**
   - ファイルリスト画面で「テストノートを読んで」と送信
   - バックエンドログで `fetch_file_content` リクエストを確認
   - フロントエンドが `file_content_response` を返すか確認
   - LLMがファイル内容を理解して応答するか確認

### 重要なファイル

#### バックエンド
- `server/src/api/websocket.py` - WebSocket管理
- `server/src/main.py` - エンドポイント
- `server/src/llm/tools/read_file.py` - read_fileツール

#### フロントエンド
- `app/features/chat/services/websocketService.ts` - WebSocketクライアント
- `app/features/chat/index.ts` - ChatService
- `app/initialization/tasks/initializeWebSocket.ts` - 初期化

### よくあるエラーと対処法

1. **TypeScript型エラー**:
   - `WebSocket`型が見つからない → `@types/ws`をインストール（React Nativeでは不要）

2. **インポートエラー**:
   - 相対パスが間違っている可能性
   - `@data/...`のエイリアスが正しく設定されているか確認

3. **WebSocket接続エラー**:
   - `EXPO_PUBLIC_API_BASE_URL`が設定されているか確認（`.env`）
   - ngrokが起動しているか確認
   - WebSocketのURLは`ws://`または`wss://`で始まる必要がある

4. **read_fileツールが呼ばれない**:
   - LLMのプロンプトを確認（read_fileツールの説明が正しいか）
   - ツールが`AVAILABLE_TOOLS`に登録されているか確認（`server/src/llm/tools/__init__.py`）

### 確認コマンド

```bash
# バックエンド構文チェック ✅ 全てパス
cd server
python -m py_compile src/api/websocket.py
python -m py_compile src/main.py
python -m py_compile src/llm/tools/read_file.py

# バックエンドlintチェック ✅ 全てパス
docker exec server-api-1 bash -c "cd /app && ruff check src/"

# バックエンド型チェック ✅ 全てパス
docker exec server-api-1 bash -c "cd /app && mypy src/"

# フロントエンド型チェック ✅ 全てパス
cd app
npm run type-check

# Dockerコンテナ状態確認 ✅ 起動中
docker compose ps
```

### デバッグのヒント

- バックエンドログ: `docker logs -f server-api-1`
- フロントエンドログ: Metro bundlerコンソール + アプリ内logger
- WebSocketメッセージをログ出力するよう設定済み
- `logger.debug('websocket', ...)` でWebSocket関連ログを確認

---

**注意**: このissueは2つのコミットで実装完了し、全ての型エラーとlintエラーが修正されました。次は実機/シミュレータでの動作確認を行ってください。
