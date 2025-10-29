---
title: "APIキー管理の外部化 (Google Secret Managerの導入)"
id: 04 # issueのユニークID
status: done # new | in-progress | blocked | pending-review | completed
priority: high # high | medium | low
attempt_count: 0 # このissueへの挑戦回数。失敗のたびにインクリメントする
tags: [security, backend, infrastructure, api-key, google-cloud]
---

## 概要 (Overview)

LLM接続用のAPIキーをGoogle Secret Managerで管理するように変更し、クライアントアプリから完全に分離する。これにより、APIキーのセキュリティを強化し、運用を効率化する。

## 背景 (Background)

多くのユーザーが利用するLLM連携機能付きノートアプリにおいて、APIキーの安全な管理は最重要課題の一つである。現在のAPIキー管理方法ではセキュリティリスクや運用上の課題があるため、Google Secret Managerを導入し、APIキーの外部化と集中管理を実現する。ユーザーにAPIキーの存在を意識させないことで、より良いユーザー体験を提供する。

## 受け入れ条件 (Acceptance Criteria)

- [x] LLM接続用のAPIキーがGoogle Secret Managerに安全に保管されていること。
- [x] バックエンドサーバーがGoogle Secret ManagerからAPIキーを正常に取得できること。
- [x] バックエンドサーバーが取得したAPIキーを使用してLLMプロバイダーと通信できること。
- [x] クライアントアプリがLLM機能を利用する際に、APIキーを直接保持または参照していないこと。
- [x] サービスアカウントの認証情報が、最小権限の原則に基づいて設定されていること。
- [x] `server/requirements.txt`に`google-cloud-secret-manager`が追加されていること。
- [x] 開発環境でのAPIキーの扱いについて、安全なフォールバックまたは代替手段が用意されていること。

## 関連ファイル (Related Files)

- `server/src/main.py` (APIキーの取得と初期化ロジック)
- `server/src/services.py` (LLMとの通信部分)
- `server/requirements.txt` (必要なライブラリの追加)
- `server/Dockerfile` (環境変数の設定など)
- `docs/specifications/requirements.md` (関連要件の確認)

## 制約条件 (Constraints)

- 既存のLLM連携機能が中断なく動作すること。
- APIキーの漏洩リスクを最小限に抑えること。
- 本番環境では、サービスアカウントのキーファイルをGitリポジトリに含めないこと。
- 開発環境でのテストを容易にするための代替手段を考慮すること。
- 将来的なAPIキーのローテーションを考慮した設計とすること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---
### 試行 #2
...

---
