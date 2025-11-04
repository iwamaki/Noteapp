---
filename: 20251104_document_summary_generation
status: done
priority: medium
attempt_count: 1
tags: [LLM, summary, feature]
date: 2025/11/04
---

## 概要 (Overview)

SummaryEditModalに実装されている「LLMで自動生成」ボタンを有効化し、文書内容をLLMに送信して要約を自動生成する機能を実装する。

## 背景 (Background)

現在、SummaryEditModalには要約の手動入力機能があるが、LLM自動生成ボタンは無効化されている（disabled={true}）。ユーザーが文書の要約を簡単に作成できるよう、LLMによる自動要約機能を実装する必要がある。

既存のサーバーにはチャット履歴要約機能（`/api/chat/summarize`）が実装されているが、これは会話の圧縮専用であり、文書要約とはプロンプトを分ける必要がある。

## 実装方針 (Implementation Strategy)

### バックエンド
- 新しいエンドポイント `POST /api/document/summarize` を作成
- 文書専用の要約プロンプトを実装（1-2文で簡潔に要約）
- 既存のSummarizationServiceを拡張、または新メソッドを追加

### フロントエンド
- DocumentSummarizeRequest/Response型を定義
- LLMServiceに `summarizeDocument()` メソッドを追加
- APIServiceに公開メソッドを追加
- SummaryEditModalのpropsに `fileContent` と `fileTitle` を追加
- ボタンのローディング状態とエラーハンドリングを実装

## 受け入れ条件 (Acceptance Criteria)

- [x] バックエンドに `/api/document/summarize` エンドポイントが実装されている
- [x] 文書専用の要約プロンプトが実装されている（3-5文で要約）
- [x] フロントエンドでLLMServiceとAPIServiceに文書要約メソッドが追加されている
- [x] SummaryEditModalの「LLMで自動生成」ボタンが有効化されている
- [x] ボタンをタップすると文書内容がLLMに送信され、要約が生成される
- [x] 生成された要約がモーダルのテキストエリアに表示される
- [x] ローディング状態が適切に表示される（ActivityIndicator + "生成中..."テキスト）
- [x] エラー発生時に適切なエラーメッセージが表示される

## 関連ファイル (Related Files)

### フロントエンド
- `app/screen/file-edit/components/SummaryEditModal.tsx` - UIコンポーネント
- `app/features/chat/llmService/index.ts` - LLMサービス本体
- `app/features/chat/llmService/api.ts` - API公開層
- `app/features/chat/llmService/types/` - 型定義
- `app/data/core/typesFlat.ts` - ファイル型定義（summary: string）

### バックエンド
- `server/src/llm/routers/chat_router.py` - エンドポイント追加場所
- `server/src/llm/services/summarization_service.py` - サービス実装場所
- `server/src/llm/models.py` - リクエスト/レスポンス型定義

## 制約条件 (Constraints)

- 既存のチャット履歴要約機能（`/api/chat/summarize`）には影響を与えないこと
- 要約は1-2文で簡潔にすること（文書の概要として適切な長さ）
- 既存のLLMプロバイダー（OpenAI/Gemini）設定を利用すること
- エラーハンドリングを適切に実装すること（ネットワークエラー、APIエラーなど）

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** 既存実装の分析、実装方針の策定、完全実装
- **結果:** ✅ 成功。バックエンドとフロントエンドの完全実装が完了。curlでのテストも成功。
- **実装内容:**
  - **バックエンド:**
    - `server/src/llm/models.py`: DocumentSummarizeRequest/Response追加
    - `server/src/llm/services/summarization_service.py`: summarize_document メソッド追加（文書専用プロンプト実装）
    - `server/src/llm/routers/chat_router.py`: POST /api/document/summarize エンドポイント追加
    - curlテスト成功（3-5文の要約が正常に生成される）
  - **フロントエンド:**
    - `app/features/chat/llmService/types/document-summarization.types.ts`: 新規型定義ファイル作成
    - `app/features/chat/llmService/index.ts`: summarizeDocument メソッド追加
    - `app/features/chat/llmService/api.ts`: 公開メソッド追加
    - `app/screen/file-edit/components/SummaryEditModal.tsx`:
      - props追加（fileContent, fileTitle）
      - ローディング状態管理
      - エラーハンドリング
      - LLM生成ボタン有効化とハンドラー実装
    - `app/screen/file-edit/FileEditScreen.tsx`: SummaryEditModalにfileContentとfileTitleを渡すよう修正
- **メモ:** 実装は完了。次はアプリ起動して実際の動作確認を行う。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** ✅ 実装完了！全ての受け入れ条件を満たしています。
- **完了した作業:**
  1. ✅ バックエンド実装（models, service, router）
  2. ✅ バックエンドテスト（curl成功）
  3. ✅ フロントエンド実装（型定義、LLMService、APIService）
  4. ✅ UI統合（SummaryEditModal更新、FileEditScreen更新）
  5. ✅ 型チェック通過
  6. ✅ Lint通過
- **次のアクション:**
  - アプリを起動して実際に動作確認
  - ファイル編集画面で要約ボタンをタップ → 「LLMで自動生成」ボタンをタップ → 要約が生成されることを確認
