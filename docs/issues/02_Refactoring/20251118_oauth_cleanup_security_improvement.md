---
filename: 20251118_oauth_cleanup_security_improvement
status: in-progress
priority: A:high
attempt_count: 1
tags: [security, refactoring, OAuth, authentication]
date: 2025/11/18
---

## 概要 (Overview)

Google OAuth認証の実装を**ID Token Flow**から**Authorization Code Flow**に統一し、セキュリティを強化する。現在2つのOAuthフローが併存している混乱状態を整理し、約490行の未使用コードを削除する。

## 背景 (Background)

### 実装の変遷

**4日前 (11/14):**
- デバイスID認証の基礎を構築 (commit: bf436ef)

**2日前 (11/16 19:13):**
- Google OAuth2を初回実装 (commit: 81cb2ca)
- **ID Token Flow**を採用
  - `googleOAuthService.ts` - Expo Auth Sessionを使用
  - `google_auth.py` - Google ID Token検証
  - Custom URI Scheme使用
- **セキュリティ問題**: ID TokenがクライアントサイドでGoogleから直接取得され、Client Secretが不要 = アプリのなりすましが可能

**26時間前 (11/17 07:33):**
- **Authorization Code Flow**への完全移行を実装 (commit: 45388a4)
- `useGoogleAuthCodeFlow.ts` - セキュアな認証フロー
- `google_oauth_flow.py` - バックエンドでのトークン交換
- `oauth_state_manager.py` - CSRF保護
- Commit message: "Migrate from deprecated Custom URI Scheme (Implicit Flow) to secure Authorization Code Flow"

**24時間前〜現在:**
- Deep Link/App Linksの安定化 (commits: 7e6377d, 18fde59, 830942e, 7370f9b)
- Android App Links対応完了

### 問題点

1. **2つのOAuthフローが併存** - どちらを使うべきか不明確
2. **ID Token Flow関連のコードが完全に未使用** - 約490行のデッドコード
3. **セキュリティリスク** - 古いID Token Flowが残っている
4. **メンテナンス負荷** - 2フロー分のコードを維持する必要

### なぜ今整理が必要か

- Authorization Code Flowは2日前に実装され、すでに`SettingsScreen.tsx`で使用されている
- ID Token Flow関連コードは**どこからも呼び出されていない**ことを確認済み
- セキュリティを重視する方針に合致
- 今後の機能追加前にコードベースをクリーンにすべき

## 実装方針 (Implementation Strategy)

### フェーズ1: 未使用コードの特定と検証 ✅ (完了)

- ✅ Grep/検索による使用状況の調査
- ✅ Git履歴からの変遷追跡
- ✅ 削除対象ファイルのリストアップ

### フェーズ2: ID Token Flow関連コードの削除

#### フロントエンド削除対象

1. **`app/auth/googleOAuthService.ts` (全ファイル)**
   - 196行のコード
   - `useGoogleAuth()` hookが完全に未使用
   - import/呼び出し: 0件

2. **`app/auth/authApiClient.ts` (部分削除)**
   - `loginWithGoogle()` 関数 (行137-163, 27行)
   - 呼び出し箇所: 0件

#### バックエンド削除対象

3. **`server/src/auth/google_auth.py` (全ファイル)**
   - 108行のコード
   - ID Token検証専用
   - 使用箇所: `/api/auth/google/login`エンドポイントのみ

4. **`server/src/auth/router.py` (部分削除)**
   - `/api/auth/google/login` エンドポイント (行238-396, 159行)
   - 呼び出し箇所: 0件
   - import文の整理 (`google_auth`関連)

5. **`server/src/auth/schemas.py` (部分削除)**
   - `GoogleLoginRequest` クラス
   - `GoogleLoginResponse` クラス
   - (Authorization Code Flowで不要)

### フェーズ3: ドキュメントの更新

6. **`docs/GOOGLE_OAUTH_SETUP.md`**
   - ID Token Flowの記述を削除
   - Authorization Code Flowのみに統一

### フェーズ4: 動作確認とテスト

- Google OAuth認証フローの動作確認
- SettingsScreen.tsxでのログイン/ログアウトテスト
- Deep Link/App Linksの動作確認

## 受け入れ条件 (Acceptance Criteria)

- [x] Git履歴から実装の変遷を確認
- [x] ID Token Flow関連コードが未使用であることを確認
- [ ] `app/auth/googleOAuthService.ts` を削除
- [ ] `app/auth/authApiClient.ts` から `loginWithGoogle()` を削除
- [ ] `server/src/auth/google_auth.py` を削除
- [ ] `server/src/auth/router.py` から `/api/auth/google/login` エンドポイントを削除
- [ ] `server/src/auth/router.py` のimport文を整理
- [ ] `server/src/auth/schemas.py` から不要なスキーマを削除
- [ ] `docs/GOOGLE_OAUTH_SETUP.md` を更新
- [ ] SettingsScreen.tsxでGoogle OAuth認証が正常に動作することを確認
- [ ] Deep Link/App Linksが正常に動作することを確認
- [ ] Gitコミット作成 (リファクタリング記録)
- [ ] 削除前後の行数差分を確認 (約490行削減)

## 関連ファイル (Related Files)

### 削除対象ファイル
- `app/auth/googleOAuthService.ts` (全削除)
- `server/src/auth/google_auth.py` (全削除)

### 部分削除対象ファイル
- `app/auth/authApiClient.ts` (`loginWithGoogle()` 関数)
- `server/src/auth/router.py` (`/api/auth/google/login` エンドポイント)
- `server/src/auth/schemas.py` (GoogleLogin関連スキーマ)

### 更新対象ファイル
- `docs/GOOGLE_OAUTH_SETUP.md`

### 確認対象ファイル (削除後も使用される)
- `app/auth/useGoogleAuthCodeFlow.ts` (Authorization Code Flow - 保持)
- `app/settings/SettingsScreen.tsx` (OAuth認証の呼び出し元)
- `server/src/auth/google_oauth_flow.py` (トークン交換 - 保持)
- `server/src/auth/oauth_state_manager.py` (CSRF保護 - 保持)

## 制約条件 (Constraints)

### セキュリティ要件
- **Authorization Code Flow**のみを使用すること (ID Token Flowは廃止)
- Client Secretはサーバーサイドでのみ使用すること
- CSRF保護 (state parameter) を維持すること
- トークンはSecureStoreで暗号化保存すること

### 後方互換性
- デバイスID認証は維持すること (OAuth認証とは独立)
- 既存のJWT認証フローは変更しないこと
- 既存ユーザーのログイン状態は保持すること

### コード品質
- 未使用のimport文を削除すること
- ESLintエラーが発生しないこと
- TypeScript型エラーが発生しないこと

### ドキュメント
- ドキュメントはAuthorization Code Flowのみを記載すること
- 削除した理由をGitコミットメッセージに明記すること

## 開発ログ (Development Log)

---
### 試行 #1 (2025/11/18)

**試みたこと:**
1. Git履歴の詳細調査 (2ヶ月分のコミット履歴)
2. OAuth関連ファイルの使用状況をGrep/Globで全検索
3. 実装の変遷を時系列で整理
4. 削除対象ファイルのリストアップ
5. 削除による影響範囲の分析

**結果:**
- ✅ ID Token Flow関連コードが**完全に未使用**であることを確認
  - `googleOAuthService.ts` - import 0件、呼び出し 0件
  - `loginWithGoogle()` - 呼び出し 0件 (コメント内の例のみ)
  - `/api/auth/google/login` - APIコール 0件
- ✅ Authorization Code Flowのみが使用されていることを確認
  - `useGoogleAuthCodeFlow` - `SettingsScreen.tsx`から使用
  - `/api/auth/google/auth-start`, `/api/auth/google/callback` - 稼働中
- ✅ 削除による影響: なし (デッドコードのため)
- ✅ 削除対象行数: 約490行

**メモ:**
- 実装の変遷が完全に追跡できた
- セキュリティ改善のため、2日前にAuthorization Code Flowに移行済み
- ID Token Flow関連コードは移行後、完全に放置されている
- 削除のリスクは極めて低い (未使用コードのため)

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況

**完了:**
- ✅ OAuth実装の全体像を把握
- ✅ Git履歴から変遷を追跡
- ✅ 削除対象ファイルを特定
- ✅ 使用状況をGrep/Globで検証
- ✅ リファクタリング計画書を作成 (本ドキュメント)

**未完了:**
- 実際のコード削除作業
- ドキュメント更新
- 動作確認テスト

### 次のアクション

1. **フェーズ2を実行: コード削除**
   - フロントエンド削除 (2ファイル)
   - バックエンド削除 (3ファイル)
   - import文の整理

2. **フェーズ3を実行: ドキュメント更新**
   - `docs/GOOGLE_OAUTH_SETUP.md` からID Token Flow記述を削除

3. **フェーズ4を実行: 動作確認**
   - SettingsScreen.tsxでのOAuth認証テスト
   - Deep Link動作確認

4. **Gitコミット作成**
   ```
   refactor: Remove deprecated ID Token Flow and unify OAuth to Authorization Code Flow

   Security improvements by removing vulnerable ID Token Flow implementation.

   Deleted files:
   - app/auth/googleOAuthService.ts (196 lines)
   - server/src/auth/google_auth.py (108 lines)

   Removed code:
   - app/auth/authApiClient.ts: loginWithGoogle() (27 lines)
   - server/src/auth/router.py: /api/auth/google/login endpoint (159 lines)
   - server/src/auth/schemas.py: GoogleLogin schemas

   Total: ~490 lines removed

   Benefits:
   - Single OAuth flow (Authorization Code Flow only)
   - Improved security (Client Secret on backend only)
   - Reduced maintenance burden
   - Cleaner codebase
   ```

### 考慮事項/ヒント

- **削除順序**: フロントエンド → バックエンド の順で削除すると安全
- **import文の整理**: `router.py` の `from src.auth.google_auth import ...` を削除
- **schemas.py**: `GoogleLoginRequest`, `GoogleLoginResponse` のみ削除 (他のスキーマは保持)
- **テスト環境**: ngrok URLが必要な場合は `.env` を確認
- **Deep Link確認**: Android StudioのlogcatでIntent Filterの動作を確認できる

### 削除実行時の注意点

1. **Gitで削除前の状態を保存しておく**
   ```bash
   git add -A
   git stash  # 念のため一時保存
   ```

2. **削除後は必ずビルドエラーをチェック**
   ```bash
   # フロントエンド
   npm run lint
   npm run type-check

   # バックエンド
   cd server
   python -m mypy src/auth/
   ```

3. **削除後はgit statusで確認**
   ```bash
   git status
   git diff
   ```

このドキュメントを読めば、次のセッションでスムーズに削除作業を開始できます。
