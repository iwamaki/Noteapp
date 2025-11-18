# 認証・API通信基盤の調査結果

**調査日**: 2025-11-18
**調査者**: Claude Code
**対象範囲**: フロントエンド・バックエンドの認証およびAPI通信機能

---

## 📋 調査概要

OAuth認証実装が進んだことを受けて、フロントエンドとバックエンドの認証・API関係ファイルを包括的に分析し、現状の問題点を特定した。

**調査対象ファイル数**: 20ファイル
- バックエンド認証: 7ファイル
- バックエンドAPI: 3ファイル
- フロントエンド認証: 6ファイル
- フロントエンドAPIクライアント: 5ファイル

---

## 🏗️ アーキテクチャ概要

### バックエンド（Python/FastAPI）

**認証システム:**
- デバイスID + OAuth2ハイブリッド認証
- JWT Bearer Token（アクセストークン: 30分、リフレッシュトークン: 30日）
- Google OAuth2 Authorization Code Flow
- slowapiによるレート制限
- FastAPI Dependencies による認証ミドルウェア

**主要コンポーネント:**
- `server/src/auth/router.py` - 6つのRESTエンドポイント
- `server/src/auth/service.py` - ビジネスロジック
- `server/src/auth/jwt_utils.py` - JWT生成・検証
- `server/src/auth/google_oauth_flow.py` - OAuth2実装
- `server/src/auth/oauth_state_manager.py` - State管理（**要Redis移行**）

### フロントエンド（TypeScript/React Native）

**認証システム:**
- expo-secure-store（iOS Keychain / Android Keystore）によるトークン管理
- カスタムフックによるOAuth2フロー
- Deep Link（Custom URI Scheme + App Links）
- デバイスID（UUID v4）管理

**通信基盤:**
- **HTTP**: Axios + リトライ機構 + 指数バックオフ
- **WebSocket**: 自動再接続 + ハートビート + イベントハンドラー
- **エラーハンドリング**: 統一エラートランスフォーマー + ユーザーフレンドリーメッセージ

**主要コンポーネント:**
- `app/auth/tokenService.ts` - セキュアトークンストレージ
- `app/auth/useGoogleAuthCodeFlow.ts` - OAuth2フック
- `app/features/api/clients/HttpClient.ts` - HTTP通信ラッパー
- `app/features/api/clients/WebSocketClient.ts` - WebSocket通信ラッパー

---

## 🔍 詳細調査結果

### バックエンド

#### 認証エンドポイント

| エンドポイント | メソッド | レート制限 | 機能 |
|-------------|---------|----------|------|
| `/api/auth/register` | POST | 10 req/min | デバイス登録 |
| `/api/auth/verify` | POST | 20 req/min | デバイス検証 |
| `/api/auth/refresh` | POST | 20 req/min | トークンリフレッシュ |
| `/api/auth/google/auth-start` | POST | 20 req/min | OAuth開始 |
| `/api/auth/google/callback` | GET | なし ⚠️ | OAuthコールバック |
| `/api/auth/callback` | GET | なし | App Linksコールバック |

**懸念点:**
- OAuthコールバックエンドポイントにレート制限なし → 列挙攻撃のリスク
- デバイス登録解除エンドポイントなし
- ログアウトエンドポイントなし

#### JWT実装

```python
# server/src/auth/jwt_utils.py
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # 30分
REFRESH_TOKEN_EXPIRE_DAYS = 30    # 30日
ALGORITHM = "HS256"               # HMAC-SHA256
```

**セキュリティ設定:**
- ✅ Bearer Token認証
- ✅ 適切な有効期限
- ⚠️ デフォルトシークレットキー（環境変数設定必須）
- ❌ トークン無効化機構なし

#### OAuth2 State Manager

**現在の実装:**
- インメモリストレージ（Pythonの辞書）
- TTL: 5分
- 自動クリーンアップ機構

**問題点（致命的）:**
```python
# server/src/auth/oauth_state_manager.py
# 注: 本番環境では Redis を使用することを推奨
```
- マルチインスタンス環境で動作不可
- サーバー再起動で全State消失
- ロードバランサー環境では必ず失敗

### フロントエンド

#### トークン管理

**実装方法:**
```typescript
// app/auth/tokenService.ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
```

**セキュリティ:**
- ✅ プラットフォームレベルの暗号化ストレージ
- ✅ メモリ上に平文保存しない
- ❌ トークン有効期限チェックなし
- ❌ 自動リフレッシュ機構なし

#### HTTP通信

**リトライ設定:**
- 最大リトライ回数: 3回
- 指数バックオフ: 2^n × ベースディレイ
- リトライ対象ステータスコード: 408, 429, 500, 502, 503, 504

**認証ヘッダー:**
```typescript
// リクエストインターセプター内
const authHeaders = await getAuthHeaders();
config.headers = { ...config.headers, ...authHeaders };
```

**問題点:**
- 認証ヘッダーが非同期取得されるが、トークンリフレッシュとの連携なし
- 401エラー時の自動リフレッシュ未実装
- Circuit Breakerパターン未実装

#### WebSocket通信

**接続管理:**
- 自動再接続: 最大5回、2秒ベースディレイ
- ハートビート: 30秒間隔
- タイムアウト: 60秒

**認証フロー:**
```typescript
// 接続時のみ送信
send({ type: 'auth', token: accessToken })
```

**問題点:**
- 接続時のみ認証メッセージ送信
- 長時間接続でトークン期限切れ時の処理なし
- トークンリフレッシュ機構なし

---

## 🚨 発見された問題

### 🔴 緊急度: 致命的（Critical）

#### 1. デバイスIDフォーマット不一致

**場所:** `app/auth/useGoogleAuthCodeFlow.ts:45`

**問題:**
```typescript
// 現在の実装
const deviceId = `${Platform.OS}_${Constants.deviceId}_${Date.now()}`;
// 例: "ios_1234567890_1700000000000"
```

**期待される形式:**
```typescript
// UUID v4が必要
const deviceId = await getOrCreateDeviceId();
// 例: "550e8400-e29b-41d4-a716-446655440000"
```

**影響:**
- バックエンドの検証で必ず失敗
- OAuth認証が完全に動作不可

**ファイルパス:** `app/auth/useGoogleAuthCodeFlow.ts:45`

---

#### 2. OAuth State Managerが本番環境で動作不可

**場所:** `server/src/auth/oauth_state_manager.py`

**問題:**
- インメモリストレージ（Python辞書）使用
- マルチインスタンス環境で動作不可
- サーバー再起動で全State消失

**影響:**
- ロードバランサー配下では100%失敗
- スケーラビリティゼロ
- 本番環境では使用不可

**推奨対応:**
- Redis への移行
- または PostgreSQL のセッションテーブル使用

---

#### 3. トークン自動リフレッシュ機構の欠如

**場所:** `app/features/api/clients/HttpClient.ts`

**問題:**
- 401エラー時の自動リフレッシュ処理なし
- アクセストークン期限切れ（30分後）にすべてのAPIリクエスト失敗
- ユーザーは再ログインを強制される

**必要な実装:**
```typescript
// レスポンスインターセプターに追加
if (error.response?.status === 401) {
  // 1. リフレッシュトークンで新規アクセストークン取得
  // 2. 元のリクエストをリトライ
  // 3. リフレッシュ失敗時のみログアウト
}
```

**ファイルパス:** `app/features/api/clients/HttpClient.ts:60-80`

---

#### 4. ログアウト機能の未実装

**問題箇所:**
- バックエンド: ログアウトエンドポイントなし
- トークン無効化機構なし

**影響:**
- クライアント側でトークンを削除しても、サーバー側では有効なまま
- 盗まれたリフレッシュトークンで30日間アクセス可能
- セキュリティリスク大

**必要な実装:**
- `POST /api/auth/logout` エンドポイント
- トークンブラックリスト（Redis推奨）
- またはトークンバージョニング機構

---

### 🟡 緊急度: 高（High）

#### 5. WebSocket認証トークンのリフレッシュ未対応

**場所:** `app/features/api/clients/WebSocketClient.ts:120-130`

**問題:**
- 接続確立時のみ認証メッセージ送信
- 長時間接続（30分以上）でトークン期限切れ
- 期限切れ後も通信続行（セキュリティリスク）

**推奨対応:**
- トークン期限前（例: 25分）に自動リフレッシュ
- 新しいトークンで再認証メッセージ送信
- タイマーベースの定期チェック

---

#### 6. マルチデバイス対応の不足

**場所:** データベーススキーマ、`server/src/auth/service.py`

**問題:**
- ユーザーあたり1デバイスのみサポート
- 新デバイスでログイン時、旧デバイスのトークンが無効化される可能性

**影響:**
- スマホとタブレット併用不可
- デバイス買い替え時の移行が困難

**推奨対応:**
- デバイス管理テーブルの見直し
- マルチデバイスセッション管理
- デバイス一覧表示UI

---

#### 7. 認証状態の集中管理の欠如

**問題:**
- 認証状態が複数のhooks/servicesに分散
- グローバルな認証状態の把握が困難

**影響:**
- コンポーネント間の連携が煩雑
- ログイン状態の整合性維持が難しい

**推奨対応:**
- React Context または Zustand で認証状態を集中管理
- `useAuth()` フックで統一アクセス

---

#### 8. JWT_SECRET_KEYのデフォルト値リスク

**場所:** `server/src/auth/jwt_utils.py:10`

**問題:**
```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
```

**影響:**
- 環境変数未設定時に脆弱なデフォルト値使用
- トークン偽造のリスク

**推奨対応:**
- 環境変数未設定時にアプリケーション起動拒否
- 起動時バリデーション追加

---

### 🟢 緊急度: 中（Medium）

#### 9. リクエストトレーシングの不足

**問題:**
- リクエストIDによる分散トレーシングなし
- エラー発生時のデバッグが困難
- ログの相関が取れない

**推奨対応:**
- リクエストIDミドルウェア追加
- X-Request-ID ヘッダーの送受信
- ログにリクエストID含める

---

#### 10. CSRF保護の欠如

**問題:**
- 状態変更操作にCSRFトークンなし
- クロスサイトリクエストフォージェリの脆弱性

**推奨対応:**
- FastAPI の CSRF保護ミドルウェア追加
- または SameSite Cookie設定

---

#### 11. エラーメッセージの国際化未対応

**場所:** `app/features/api/services/ApiErrorHandler.ts:50-70`

**問題:**
- すべてのエラーメッセージが日本語にハードコード
- 多言語対応不可

**例:**
```typescript
case 401: return "認証に失敗しました";
case 403: return "アクセスが拒否されました";
```

**推奨対応:**
- i18nライブラリ導入（react-i18next等）
- エラーメッセージキーによる管理

---

#### 12. デバイス登録解除エンドポイントの欠如

**問題:**
- デバイスの登録解除ができない
- 時間とともにデバイスレコードが蓄積
- デバイス管理UIが作れない

**推奨対応:**
- `DELETE /api/auth/devices/{device_id}` エンドポイント追加
- デバイス一覧取得エンドポイント追加

---

### 🔵 緊急度: 低（Low）

#### 13. ハードコードされた設定値

**場所:**
- `app/features/api/clients/WebSocketClient.ts` - 再接続回数、ディレイ
- `app/features/api/clients/HttpClient.ts` - タイムアウト、リトライ回数

**問題:**
- 設定値がコードにハードコード
- 環境ごとの調整が困難

**推奨対応:**
- 環境変数または設定ファイルに外出し

---

#### 14. 生体認証の未実装

**問題:**
- 指紋認証、顔認証未対応
- セキュリティとUXの向上機会

**推奨対応:**
- expo-local-authentication 導入
- SecureStore アクセス時の生体認証要求

---

## 📊 ファイル一覧

### バックエンド認証（7ファイル）

1. `server/src/auth/router.py` - RESTエンドポイント定義
2. `server/src/auth/service.py` - ビジネスロジック
3. `server/src/auth/jwt_utils.py` - JWT生成・検証
4. `server/src/auth/dependencies.py` - FastAPI依存性注入
5. `server/src/auth/google_oauth_flow.py` - OAuth2実装
6. `server/src/auth/oauth_state_manager.py` - State管理
7. `server/src/auth/schemas.py` - Pydanticモデル

### バックエンドAPI（3ファイル）

1. `server/src/main.py` - FastAPIアプリケーション設定
2. `server/src/api/websocket.py` - WebSocket接続管理
3. `server/src/api/billing_router.py` - 課金エンドポイント

### フロントエンド認証（6ファイル）

1. `app/auth/tokenService.ts` - トークンストレージ
2. `app/auth/deviceIdService.ts` - デバイスID管理
3. `app/auth/googleUserService.ts` - Googleプロフィール管理
4. `app/auth/authHeaders.ts` - 認証ヘッダー生成
5. `app/auth/useGoogleAuthCodeFlow.ts` - OAuth2フック
6. `app/auth/authApiClient.ts` - 認証APIクライアント

### フロントエンドAPIクライアント（5ファイル）

1. `app/features/api/clients/HttpClient.ts` - HTTPラッパー
2. `app/features/api/clients/WebSocketClient.ts` - WebSocketラッパー
3. `app/features/api/services/ApiErrorHandler.ts` - エラーハンドリング
4. `app/features/api/types/api.types.ts` - 型定義
5. `app/features/api/utils/retry.ts` - リトライロジック

### サポートファイル

1. `app/initialization/tasks/authenticateDevice.ts` - 起動時認証
2. `server/src/billing/models.py` - データベーススキーマ

---

## ✅ 対応チェックリスト

### 🔴 緊急対応（即座〜1週間以内）

- [x] **#1** デバイスIDフォーマット修正 (`app/auth/useGoogleAuthCodeFlow.ts:45`)
  - [x] `getOrCreateDeviceId()` を使用するように変更
  - [x] 既存のデバイスID生成ロジックを削除
  - [x] 動作確認（OAuth認証フロー全体） ✅ UUID v4形式で認証成功

- [ ] **#2** OAuth State ManagerのRedis移行 (`server/src/auth/oauth_state_manager.py`)
  - [ ] Redis接続設定追加
  - [ ] RedisStateManager クラス実装
  - [ ] インメモリ実装との互換性確保
  - [ ] 環境変数でストレージ切り替え可能に
  - [ ] ローカル開発環境でのRedis起動確認

- [ ] **#3** トークン自動リフレッシュ機構実装 (`app/features/api/clients/HttpClient.ts`)
  - [ ] 401レスポンスインターセプター追加
  - [ ] リフレッシュトークンでアクセストークン再取得
  - [ ] 元のリクエストをリトライ
  - [ ] リフレッシュ失敗時のログアウト処理
  - [ ] 同時リフレッシュリクエストの制御（重複防止）

- [ ] **#4** ログアウト機能実装
  - [ ] バックエンド: `POST /api/auth/logout` エンドポイント作成
  - [ ] トークンブラックリスト実装（Redis推奨）
  - [ ] フロントエンド: ログアウト処理実装
  - [ ] ログアウト後の画面遷移
  - [ ] セッション完全クリア確認

- [ ] **#8** JWT_SECRET_KEY起動時バリデーション (`server/src/auth/jwt_utils.py`)
  - [ ] 環境変数未設定時にエラー送出
  - [ ] main.py の startup イベントでチェック
  - [ ] デフォルト値の削除

### 🟡 高優先対応（2週間以内）

- [ ] **#5** WebSocket認証トークンリフレッシュ (`app/features/api/clients/WebSocketClient.ts`)
  - [ ] トークン有効期限監視タイマー追加
  - [ ] 期限前（25分）に自動リフレッシュ
  - [ ] 新トークンで再認証メッセージ送信
  - [ ] 長時間接続での動作確認

- [ ] **#6** マルチデバイス対応
  - [ ] データベーススキーマ見直し
  - [ ] デバイス管理エンドポイント追加
  - [ ] デバイス一覧取得API
  - [ ] フロントエンド: デバイス管理UI

- [ ] **#7** 認証状態の集中管理
  - [ ] React Context または Zustand でストア作成
  - [ ] `useAuth()` フック実装
  - [ ] 既存コンポーネントの移行
  - [ ] グローバル認証状態の確認

### 🟢 中優先対応（1ヶ月以内）

- [ ] **#9** リクエストトレーシング
  - [ ] リクエストIDミドルウェア追加
  - [ ] X-Request-ID ヘッダー送受信
  - [ ] ログにリクエストID含める
  - [ ] 分散トレーシング設定

- [ ] **#10** CSRF保護
  - [ ] FastAPI CSRF ミドルウェア追加
  - [ ] フロントエンド: CSRFトークン送信
  - [ ] SameSite Cookie 設定

- [ ] **#11** エラーメッセージ国際化
  - [ ] i18nライブラリ導入
  - [ ] エラーメッセージキー定義
  - [ ] 多言語対応ファイル作成

- [ ] **#12** デバイス管理エンドポイント
  - [ ] `GET /api/auth/devices` - デバイス一覧
  - [ ] `DELETE /api/auth/devices/{device_id}` - デバイス削除
  - [ ] フロントエンド: デバイス管理画面

### 🔵 低優先対応（将来的に）

- [ ] **#13** 設定値の外部化
  - [ ] 環境変数または設定ファイルに移行
  - [ ] WebSocket設定
  - [ ] HTTP設定

- [ ] **#14** 生体認証実装
  - [ ] expo-local-authentication 導入
  - [ ] 生体認証フロー実装
  - [ ] 設定画面追加

### その他の改善

- [ ] OAuthコールバックエンドポイントにレート制限追加
- [ ] Circuit Breakerパターン実装
- [ ] トークン有効期限UIインジケーター
- [ ] API versioning 戦略策定
- [ ] セッションタイムアウト警告UI
- [ ] 監査ログ実装（認証イベント）

---

## 📝 備考

- 本ドキュメントは2025-11-18時点の調査結果です
- チェックリストは優先度順に並んでいます
- 各項目完了時にチェック `[x]` を入れてください
- 新たな問題が発見された場合は随時追記してください

---

**次回更新予定**: 緊急対応完了後
