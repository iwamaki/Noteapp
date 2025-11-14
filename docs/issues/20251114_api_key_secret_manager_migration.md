---
filename: 20251114_api_key_secret_manager_migration
status: completed
priority: A
attempt_count: 1
tags: [security, critical, api-key, secret-management]
date: 2025/11/14
---

## 概要 (Overview)

> 平文で保存されているAPIキーをGit履歴から完全に削除し、Secret Managerへの完全移行を実施する。

## 背景 (Background)

> セキュリティ調査の結果、以下の重大な問題が発見されました:
>
> 1. `server/.env` ファイルに Google API Key (`AIzaSyAZBUOfnOxipnw1Iv3bSPo0NMACie_Mm2k`) が平文で記載されている
> 2. このファイルは `.gitignore` に含まれているが、過去のコミット履歴に含まれている可能性がある
> 3. 現在のコードはSecret Manager対応済みだが、環境変数へのフォールバックがあるため完全移行していない
>
> APIキーが漏洩した場合、以下のリスクがあります:
> - Google Gemini APIの不正利用による高額な料金請求
> - Google Custom Search APIの悪用
> - リポジトリが公開された場合の即座の悪用
>
> **深刻度**: Critical (OWASP A02: Cryptographic Failures)

## 実装方針 (Implementation Strategy)

> 3段階のアプローチで安全にAPIキーを管理します:
>
> ### Phase 1: 即座の対応（漏洩対策）
> - 現在の API キーを Google Cloud Console で無効化
> - 新しい API キーを発行
> - Git 履歴から `.env` ファイルを完全削除
>
> ### Phase 2: Secret Manager完全移行
> - 新しい API キーを Secret Manager に登録
> - 環境変数フォールバックのコードを削除
> - Secret Manager から取得できない場合はエラーを発生させる
>
> ### Phase 3: 再発防止
> - `.env.example` ファイルを作成してリポジトリにコミット
> - Pre-commit hook で `.env` ファイルのコミットを防止
> - ドキュメント更新

## 受け入れ条件 (Acceptance Criteria)

> - [x] 漏洩した Google API Key を Google Cloud Console で無効化
> - [x] 新しい Google API Key を発行し、Secret Manager に登録
> - [x] 新しい Google CSE ID を発行し、Secret Manager に登録（必要に応じて）
> - [x] Git 履歴から `server/.env` を完全削除（`git filter-branch` または BFG使用）
> - [x] `server/src/core/config.py` から環境変数フォールバックを削除
> - [x] Secret Manager から取得できない場合にエラーを発生させる実装
> - [x] `server/.env.example` ファイルを作成
> - [x] ローカル開発環境で Secret Manager を使用して動作確認
> - [x] Docker Compose 環境でも動作確認
> - [x] `server/.env` がリポジトリに含まれていないことを確認（`git log --all --full-history -- "server/.env"` で検証）

## 関連ファイル (Related Files)

> - `server/.env` - **削除完了**
> - `server/src/core/config.py` - 環境変数フォールバック削除完了
> - `server/.gitignore` - .env の除外設定確認
> - `.git/` - 履歴削除完了
> - `server/docker-compose.yml` - 環境変数設定の見直し

## 制約条件 (Constraints)

> - API キー無効化により、既存の開発環境・本番環境が一時的に動作しなくなる可能性がある（計画的な実施が必要）
> - Git 履歴の書き換えは、他の開発者やデプロイ環境に影響を与える（個人開発なので影響は限定的）
> - Secret Manager の利用には GCP の認証情報（サービスアカウントキー）が必要
> - `GOOGLE_APPLICATION_CREDENTIALS` 環境変数が正しく設定されていること

## 開発ログ (Development Log)

> **2025/11/14 - 作業完了**
>
> 1. ✅ Google Cloud Console で古い API キーを削除、新しいキーを発行
> 2. ✅ Secret Manager に新しい API キーを登録（バージョン 2 作成）
> 3. ✅ `git filter-branch` で Git 履歴から `server/.env` を完全削除（932コミット処理）
> 4. ✅ `config.py` の環境変数フォールバックを削除、Secret Manager 必須化
> 5. ✅ `.env.example` テンプレートファイルを作成
> 6. ✅ サーバー再起動でテスト、Health エンドポイントで動作確認
> 7. ✅ コミット作成、リモートに force push 完了
>
> **結果:**
> - API キーが Git 履歴から完全に削除された
> - Secret Manager からの取得が正常に動作
> - Gemini/OpenAI プロバイダーが正常に利用可能

---

## 参考情報

### Git 履歴削除コマンド例

```bash
# 方法1: git filter-branch
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch server/.env" \
  --prune-empty --tag-name-filter cat -- --all

# 方法2: BFG Repo-Cleaner (推奨)
# https://rtyley.github.io/bfg-repo-cleaner/
bfg --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Secret Manager への登録コマンド例

```bash
# Google API Key の登録
echo -n "NEW_API_KEY_HERE" | gcloud secrets versions add GOOGLE_API_KEY \
  --data-file=- \
  --project=strategic-haven-450402-p6

# CSE ID の登録（必要に応じて）
echo -n "NEW_CSE_ID_HERE" | gcloud secrets create GOOGLE_CSE_ID \
  --data-file=- \
  --project=strategic-haven-450402-p6
```

### 修正後の config.py イメージ

```python
# Secret Managerから取得できない場合はエラー
if not self.gemini_api_key:
    raise ValueError(
        "GEMINI_API_KEY not found in Secret Manager. "
        f"Please check secret '{gemini_secret_id}' in project '{project_id}'"
    )
```
