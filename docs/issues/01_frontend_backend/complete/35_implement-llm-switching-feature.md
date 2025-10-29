title: "設定画面へのLLMプロバイダー・モデル切り替え機能の実装"
id: 35
status: done
priority: high
attempt_count: 0
tags: [LLM, settings, UI, feature]
---

## 概要 (Overview)

設定画面に、LLMのプロバイダー（OpenAI, Geminiなど）と、それに対応するモデル（例: gpt-4, gemini-1.5-pro）をユーザーが選択・変更できるUIを追加する。

## 背景 (Background)

現在のAIモデルの応答品質が低く、ユーザーがより高性能なモデルに切り替えたいと考えている。しかし、設定画面にはその機能が未実装であるため、ユーザーはモデルを変更できない。このissueは、モデル切り替え機能を実装し、ユーザーが応答品質を改善できるようにすることを目的とする。

## 受け入れ条件 (Acceptance Criteria)

- [ ] 設定画面に「LLM設定」セクションが追加されている。
- [ ] 設定画面の初期化時に `/api/llm-providers` を呼び出し、利用可能なプロバイダーとモデルのリストを取得する。
- [ ] 利用可能なLLMプロバイダーを選択するためのUI（ピッカーなど）が表示される。
- [ ] 選択したプロバイダーに応じて、利用可能なモデルを選択するためのUIが表示される。
- [ ] ユーザーがプロバイダーまたはモデルを変更すると、その設定が保存され、以降のチャットに反映される。
- [ ] APIキーが設定されていないなどの理由でプロバイダーが利用不可能な場合、その状態がUIに表示される。

## 関連ファイル (Related Files)

- `app/features/settings/SettingsScreen.tsx`
- `app/store/settingsStore.ts`
- `app/services/llmService.ts`
- `app/services/api.ts`
- `server/src/routers/llm_providers.py`

## 制約条件 (Constraints)

- 既存のUIコンポーネント（`renderPicker`など）を可能な限り再利用すること。
- APIから取得した情報を基に、UIを動的に構築すること。
- 設定の永続化には `useSettingsStore` を利用すること。

## 開発ログ (Development Log)

> このissueに関する作業の履歴を時系列で記録します。
> セッションをまたいで作業する際の引き継ぎ情報となります。

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---
