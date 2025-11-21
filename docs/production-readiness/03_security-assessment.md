# セキュリティ評価レポート

**評価日**: 2025-11-21
**対象**: フロントエンド + バックエンド

## 📊 総合セキュリティスコア

**フロントエンド**: 6/10
**バックエンド**: 8/10
**総合**: 7/10

**総合評価**: ✅ GOOD（改善の余地あり）

---

## 🎯 エグゼクティブサマリー

アプリケーションは**基本的なセキュリティ対策が適切に実装**されており、認証・認可システムは堅牢です。しかし、いくつかの**重要な脆弱性と欠落している保護層**があり、本番公開前に対応が必要です。

### 主要な発見

#### ✅ 優れている点
- JWT認証の適切な実装
- OAuth 2.0の基本的な実装
- SQL Injection保護
- IAP（アプリ内課金）検証
- トークンBlacklist機構

#### 🚨 対応が必要
- OAuth CSRF保護の強化
- セキュリティヘッダーの欠落
- 環境変数の露出
- クライアント側Rate Limitingなし
- ディープリンク検証の脆弱性

---

## 🔐 認証・認可のセキュリティ

### 1. JWT実装

#### ✅ 適切に実装されている点

**ファイル**: `server/src/auth/application/services/jwt_service.py`

```python
# 強力な秘密鍵検証
def validate_jwt_secret():
    secret = load_jwt_secret()

    # 最小32文字
    if len(secret) < 32:
        raise ValueError("JWT secret must be at least 32 characters")

    # 弱い秘密鍵の検出
    weak_secrets = ["password", "secret", "test", "12345"]
    if secret.lower() in weak_secrets:
        raise ValueError("Weak JWT secret detected")
```

**トークン構造**:
```python
{
    "sub": user_id,           # ユーザー識別子
    "device_id": device_id,   # デバイスバインディング ✅
    "type": "access",         # トークンタイプ
    "exp": expire_datetime,   # 有効期限 ✅
    "iat": issue_datetime     # 発行時刻 ✅
}
```

**評価**: ✅ EXCELLENT

**強み**:
- デバイスバインディング（トークン盗難対策）
- 適切な有効期限設定
- 秘密鍵の検証
- HS256アルゴリズム使用

#### ⚠️ 改善推奨

**1. Access Token の有効期限**

**現在**: 30分
**推奨**: 15分

**理由**:
- トークン盗難時の影響範囲を最小化
- セキュリティベストプラクティス

**変更箇所**: `server/.env.development:51`
```bash
# Before
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# After
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=15
```

**2. JTI (JWT ID) の追加**

**推奨実装**:
```python
import uuid

payload = {
    "sub": user_id,
    "device_id": device_id,
    "jti": str(uuid.uuid4()),  # 一意のトークンID
    "type": "access",
    "exp": expire_datetime,
    "iat": issue_datetime
}
```

**メリット**:
- トークンの一意性保証
- より細かいトークン無効化

---

### 2. OAuth 2.0実装

#### 🚨 CRITICAL: CSRF保護の脆弱性

**影響度**: 🔴 HIGH
**優先度**: 最優先

**脆弱な箇所**: `app/auth/useGoogleAuthCodeFlow.ts:112`

#### 現在の実装

```typescript
const handleDeepLink = (url: string) => {
  const params = new URLSearchParams(url.split('?')[1]);
  const code = params.get('code');
  const error = params.get('error');

  // ⚠️ state検証なし
  if (code) {
    exchangeCodeForToken(code);
  }
};
```

#### 攻撃シナリオ

1. 攻撃者が正規のOAuthフローを開始
2. 攻撃者がauthorization codeを取得
3. 攻撃者が被害者のブラウザで悪意のあるディープリンクを開く
   ```
   noteapp://auth?code=ATTACKER_CODE
   ```
4. 被害者のアカウントが攻撃者のGoogleアカウントにリンクされる

#### 推奨修正

**フロントエンド**: `app/auth/useGoogleAuthCodeFlow.ts`

```typescript
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

// OAuth開始時
const startOAuthFlow = async () => {
  // 暗号学的に安全なstate生成
  const state = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Date.now()}-${Math.random()}`
  );

  // Stateを安全に保存（5分TTL）
  await SecureStore.setItemAsync('oauth_state', state);
  await SecureStore.setItemAsync('oauth_state_expiry', (Date.now() + 300000).toString());

  // State付きでOAuth URL構築
  const authUrl = `${GOOGLE_AUTH_URL}?client_id=${CLIENT_ID}&state=${state}&...`;
  await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
};

// ディープリンクハンドリング
const handleDeepLink = async (url: string) => {
  const params = new URLSearchParams(url.split('?')[1]);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');

  // State検証（CRITICAL）
  const storedState = await SecureStore.getItemAsync('oauth_state');
  const expiry = await SecureStore.getItemAsync('oauth_state_expiry');

  // 有効期限チェック
  if (!expiry || Date.now() > parseInt(expiry)) {
    throw new Error('OAuth state expired');
  }

  // State一致チェック
  if (state !== storedState) {
    logger.error('OAuth CSRF detected', { received: state, expected: storedState });
    throw new Error('Invalid state parameter - possible CSRF attack');
  }

  // State削除（one-time use）
  await SecureStore.deleteItemAsync('oauth_state');
  await SecureStore.deleteItemAsync('oauth_state_expiry');

  if (code) {
    await exchangeCodeForToken(code);
  }
};
```

**バックエンド側の対応**:

バックエンドは既に適切に実装されています ✅

**ファイル**: `server/src/auth/oauth_state_manager.py`

```python
class OAuthStateManager:
    def generate_state(self, device_id: str) -> str:
        """暗号学的に安全なstate生成"""
        state = secrets.token_urlsafe(32)
        self.redis_client.setex(f"oauth:state:{state}", 300, device_id)
        return state

    def validate_state(self, state: str, device_id: str) -> bool:
        """State検証（one-time use）"""
        stored_device_id = self.redis_client.get(f"oauth:state:{state}")
        if stored_device_id != device_id:
            return False
        self.redis_client.delete(f"oauth:state:{state}")  # 使用済み削除
        return True
```

**推定作業時間**: 4-8時間

---

### 3. Token Blacklist（ログアウト）

#### ✅ 適切に実装

**ファイル**: `server/src/auth/token_blacklist_manager.py`

```python
class TokenBlacklistManager:
    def __init__(self, redis_client):
        self.redis_client = redis_client

    def blacklist_token(self, token: str, expire_seconds: int):
        """トークンをブラックリストに追加"""
        self.redis_client.setex(
            f"blacklist:{token}",
            expire_seconds,
            "1"
        )

    def is_blacklisted(self, token: str) -> bool:
        """ブラックリストチェック"""
        return self.redis_client.exists(f"blacklist:{token}") > 0
```

**評価**: ✅ EXCELLENT

**強み**:
- Redis使用（分散環境対応）
- 自動有効期限切れ
- ログアウト時の即座無効化

**注意点**:
- 本番環境では必ずRedis使用（In-Memoryは使わない）

---

## 🌐 Web脆弱性への対策

### 1. SQL Injection

**ステータス**: ✅ PROTECTED

**対策方法**:
- SQLAlchemy ORM使用（パラメータ化クエリ）
- 生SQLの使用なし

**例**:
```python
# ✅ 安全 - パラメータ化
credit = db.query(Credit).filter_by(user_id=user_id).first()

# ❌ 危険 - 文字列結合（未使用）
# db.execute(f"SELECT * FROM credits WHERE user_id = '{user_id}'")
```

**評価**: ✅ EXCELLENT

---

### 2. XSS (Cross-Site Scripting)

#### フロントエンド

**ステータス**: ✅ PROTECTED（限定的）

**対策**:
- `dangerouslySetInnerHTML` 未使用 ✅
- `eval()` / `new Function()` 未使用 ✅
- Markdownレンダリングは安全なライブラリ使用 ✅
  - `react-native-markdown-display`（自動エスケープ）

#### バックエンド

**ステータス**: ✅ PROTECTED

**対策**:
- FastAPIのJSON自動エスケープ ✅
- Pydanticバリデーション ✅

**評価**: ✅ GOOD

---

### 3. CSRF (Cross-Site Request Forgery)

#### 現状の対策

**OAuthのみ**: State パラメータ（バックエンドは✅、フロントエンドは⚠️）

#### ⚠️ 欠落している対策

**一般的なAPI操作**:
- CSRFトークンメカニズムなし
- SameSite Cookie属性の設定なし（Cookieを使用していないため影響は限定的）

#### 推奨対応

JWTベースの認証を使用しているため、以下で十分：

1. **Originヘッダー検証**

```python
# server/src/main.py
@app.middleware("http")
async def validate_origin(request: Request, call_next):
    if request.method in ["POST", "PUT", "DELETE"]:
        origin = request.headers.get("origin")
        allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

        if origin and origin not in allowed_origins:
            return JSONResponse(
                status_code=403,
                content={"detail": "Invalid origin"}
            )

    return await call_next(request)
```

**推定作業時間**: 2-4時間

---

### 4. CORS設定

**ファイル**: `server/src/main.py`

```python
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # ✅ 環境ベース
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Device-ID"],
)
```

**評価**: ✅ GOOD

**注意点**:
- 本番環境では明示的なドメインのみ許可
- ワイルドカード（`*`）は使用しない

---

## 🔒 データ保護

### 1. 機密情報の保存

#### フロントエンド

**ファイル**: `app/auth/authStore.ts`

```typescript
// ✅ 適切 - SecureStore使用
import * as SecureStore from 'expo-secure-store';

// トークン保存
await SecureStore.setItemAsync('access_token', token);
await SecureStore.setItemAsync('refresh_token', refreshToken);

// ログアウト時削除
await SecureStore.deleteItemAsync('access_token');
await SecureStore.deleteItemAsync('refresh_token');
```

**評価**: ✅ EXCELLENT

**強み**:
- OS レベルの暗号化ストレージ使用
- ログアウト時に適切にクリア

#### バックエンド

**ファイル**: `server/src/auth/infrastructure/external/secret_manager_client.py`

```python
# ✅ GCP Secret Manager使用
def load_jwt_secret() -> str:
    # 優先度1: Secret Manager
    if gcp_project_id:
        secret = get_secret_from_secret_manager(project_id, secret_id)
        if secret:
            return secret

    # 優先度2: 環境変数（開発のみ）
    return os.getenv("JWT_SECRET_KEY")
```

**評価**: ✅ EXCELLENT

---

### 2. 環境変数の露出

#### 🚨 問題: OAuth Client IDの公開

**ファイル**: `.env.production:20`

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=461522030982-4d1fak06lfpaq2ppol18899anposuukb.apps.googleusercontent.com
```

**問題点**:
- `EXPO_PUBLIC_*` はビルドに埋め込まれる（公開される）
- Decompileで簡単に抽出可能

**リスク評価**: 🟡 MEDIUM

**理由**:
- OAuth Public Clientとしては許容される設計
- Client Secretは含まれていない ✅
- ただしClient ID単体でもフィッシング等に悪用可能性

**推奨対策**:

1. **PKCEフローの確認**（より安全）
   - 現在の実装を確認
   - Code Verifier/Challengeの使用

2. **Redirect URIの厳格な検証**
   - Google Cloud Consoleで明示的に設定
   - ワイルドカードURIを使用しない

3. **ドメイン制限の設定**
   - Google Cloud Consoleでアプリのドメインを制限

**現状**: 許容範囲だが監視が必要

---

## 🛡️ API セキュリティ

### 1. Rate Limiting

#### バックエンド

**ファイル**: `server/src/main.py`

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/api/auth/register")
@limiter.limit("10/minute")  # ✅ 実装済み
async def register_device(request: Request, ...):
    pass
```

**実装済みエンドポイント**:
- `/api/auth/register` - 10/分
- `/api/auth/verify` - 20/分
- `/api/auth/refresh` - 20/分
- `/api/auth/devices` - 30/分

**評価**: ✅ GOOD

#### フロントエンド

**ステータス**: ⚠️ 未実装

**推奨実装**:

```typescript
// app/utils/rateLimiter.ts
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // 期限切れのタイムスタンプを削除
    const validTimestamps = timestamps.filter(t => now - t < windowMs);

    if (validTimestamps.length >= maxRequests) {
      return false;  // Rate limit exceeded
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return true;
  }
}

// 使用例
const rateLimiter = new RateLimiter();

async function callAPI(endpoint: string) {
  const canProceed = await rateLimiter.checkLimit(endpoint, 10, 60000);

  if (!canProceed) {
    throw new Error('Too many requests. Please try again later.');
  }

  // API call
}
```

**推定作業時間**: 4-6時間

---

### 2. 入力検証

#### Pydantic検証（バックエンド）

**ファイル**: `server/src/billing/presentation/schemas/request_schemas.py`

```python
class AddCreditsRequest(BaseModel):
    credits: int = Field(..., gt=0)  # ✅ 正の整数のみ
    purchase_record: dict = Field(...)

class AllocateCreditsRequest(BaseModel):
    allocations: list[AllocationItem] = Field(
        ...,
        min_length=1  # ✅ 最低1件
    )
```

**評価**: ✅ EXCELLENT

#### UUID検証

```python
# server/src/auth/presentation/dependencies.py
uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

if not re.match(uuid_pattern, device_id, re.IGNORECASE):
    raise HTTPException(status_code=401, detail="Invalid device ID format")
```

**評価**: ✅ EXCELLENT

---

### 3. セキュリティヘッダー

#### 🚨 CRITICAL: セキュリティヘッダーの欠落

**現状**: 未実装 ❌

**必要なヘッダー**:

```python
# server/src/main.py

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # HSTS (HTTPS強制)
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Clickjacking防止
    response.headers["X-Frame-Options"] = "DENY"

    # MIME-Sniffing防止
    response.headers["X-Content-Type-Options"] = "nosniff"

    # XSS保護（古いブラウザ向け）
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Referrer制御
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Permissions Policy
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    # CSP（Content Security Policy）
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self' https://api.noteapp.iwamaki.app"
    )

    return response
```

**優先度**: 🔴 HIGH
**推定作業時間**: 2-4時間

---

## 💰 課金システムのセキュリティ

### 1. IAP（アプリ内課金）検証

**ファイル**: `server/src/billing/infrastructure/external/iap_verifier.py`

```python
def verify_purchase(product_id: str, purchase_token: str):
    """Google Play Developer APIで検証"""

    result = service.purchases().products().get(
        packageName=PACKAGE_NAME,
        productId=product_id,
        token=purchase_token
    ).execute()

    # 購入状態チェック
    if result.get('purchaseState') != 0:
        raise ValueError("Purchase not completed")

    # 消費状態チェック
    if result.get('consumptionState') != 1:
        raise ValueError("Purchase already consumed")

    return result
```

**評価**: ✅ EXCELLENT

**強み**:
- サーバー側での検証 ✅
- Google公式API使用 ✅
- 購入状態の確認 ✅

---

### 2. 重複購入防止

**ファイル**: `server/src/billing/presentation/router.py`

```python
@router.post("/api/billing/credits/add")
async def add_credits(request: AddCreditsRequest, ...):
    # トランザクションID重複チェック
    existing = db.query(Transaction).filter_by(
        transaction_id=transaction_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Purchase already processed"
        )

    # 購入処理
    ...
```

**評価**: ✅ EXCELLENT

---

## 🔍 ログとモニタリングのセキュリティ

### 1. ログの機密情報サニタイズ

**ファイル**: `server/src/core/logger.py`

```python
def _sanitize_log_content(content: Any):
    """機密情報除外"""
    excluded_fields = {
        'signature',
        'extras',
        'api_key',
        'token',
        'password',
        'secret'
    }

    if isinstance(content, dict):
        return {
            k: _sanitize_log_content(v)
            for k, v in content.items()
            if k.lower() not in excluded_fields
        }

    return content
```

**評価**: ✅ EXCELLENT

---

### 2. ログの推奨追加事項

#### セキュリティイベントのログ

```python
# 推奨追加
security_logger = logging.getLogger("security")

# 認証失敗
security_logger.warning(
    "Authentication failed",
    extra={
        "user_id": user_id,
        "device_id": device_id[:8] + "...",  # 一部のみ
        "ip_address": request.client.host,
        "event": "auth_failed"
    }
)

# 不正なトークン
security_logger.error(
    "Invalid token detected",
    extra={
        "token_id": jti,
        "event": "invalid_token"
    }
)

# 異常なアクセスパターン
security_logger.warning(
    "Unusual access pattern detected",
    extra={
        "user_id": user_id,
        "endpoint": request.url.path,
        "event": "suspicious_activity"
    }
)
```

**推定作業時間**: 4-6時間

---

## 📱 モバイル固有のセキュリティ

### 1. ディープリンク検証

**ファイル**: `app/auth/useGoogleAuthCodeFlow.ts`

#### ⚠️ 現在の実装

```typescript
const handleDeepLink = (url: string) => {
  const params = new URLSearchParams(url.split('?')[1]);
  const code = params.get('code');
  // ⚠️ URLスキーム検証なし
}
```

#### 推奨実装

```typescript
const VALID_SCHEMES = ['noteapp', 'com.iwash.noteapp'];
const VALID_HOSTS = ['auth', 'oauth'];

const handleDeepLink = (url: string) => {
  try {
    const parsed = new URL(url);

    // スキーム検証
    if (!VALID_SCHEMES.includes(parsed.protocol.replace(':', ''))) {
      logger.error('Invalid URL scheme', { scheme: parsed.protocol });
      throw new Error('Invalid URL scheme');
    }

    // ホスト検証
    if (!VALID_HOSTS.includes(parsed.hostname)) {
      logger.error('Invalid URL host', { host: parsed.hostname });
      throw new Error('Invalid URL host');
    }

    // パラメータ取得
    const params = new URLSearchParams(parsed.search);
    const code = params.get('code');
    const state = params.get('state');

    // State検証（前述のCSRF対策）
    await validateState(state);

    if (code) {
      await exchangeCodeForToken(code);
    }
  } catch (error) {
    logger.error('Deep link validation failed', { error, url });
    // エラーハンドリング
  }
};
```

**推定作業時間**: 2-3時間

---

## 🚨 セキュリティチェックリスト

### 🔴 CRITICAL（本番前に必須）

- [ ] **OAuth CSRF保護強化**（フロントエンド）
  - State パラメータの適切な検証
  - One-time use の実装
  - 推定: 4-8時間

- [ ] **セキュリティヘッダー追加**（バックエンド）
  - HSTS, X-Frame-Options, CSP等
  - 推定: 2-4時間

- [ ] **ディープリンク検証強化**（フロントエンド）
  - URLスキーム検証
  - ホスト検証
  - 推定: 2-3時間

### 🟠 HIGH（早急に対応）

- [ ] **クライアント側Rate Limiting**（フロントエンド）
  - API呼び出しのスロットリング
  - 推定: 4-6時間

- [ ] **Origin検証**（バックエンド）
  - CSRF追加保護
  - 推定: 2-4時間

- [ ] **セキュリティイベントログ**（バックエンド）
  - 認証失敗、不正アクセスのログ
  - 推定: 4-6時間

- [ ] **JWT TTL短縮**（バックエンド）
  - 30分 → 15分
  - 推定: 1時間

### 🟡 MEDIUM（公開後1ヶ月以内）

- [ ] **アカウントロックアウト**
  - 連続ログイン失敗の検出
  - 推定: 1日

- [ ] **IP Whitelisting**（オプション）
  - 管理APIの保護
  - 推定: 4時間

- [ ] **セキュリティ監査ログ**
  - 全てのセキュリティイベント記録
  - 推定: 1日

---

## 🔒 セキュリティベストプラクティス

### 本番環境の推奨事項

1. **HTTPS強制**
   - すべての通信をHTTPS経由
   - TLS 1.3 使用

2. **WAF (Web Application Firewall)**
   - CloudFlare, AWS WAF等の導入
   - DDoS攻撃対策

3. **定期的なセキュリティスキャン**
   - OWASP ZAP
   - Burp Suite
   - 月1回の実施

4. **依存関係の脆弱性スキャン**
   - npm audit (フロントエンド)
   - safety / pip-audit (バックエンド)
   - CI/CDパイプラインに統合

5. **Secret Rotation**
   - JWT Secret の定期ローテーション
   - API Key のローテーション
   - 3-6ヶ月ごと

6. **監査ログの保持**
   - 全てのセキュリティイベント記録
   - 最低1年間保持

---

## 📊 セキュリティスコア詳細

| カテゴリー | フロントエンド | バックエンド | 総合 |
|----------|-------------|------------|------|
| 認証・認可 | 7/10 | 9/10 | 8/10 |
| データ保護 | 8/10 | 9/10 | 8.5/10 |
| API セキュリティ | 5/10 | 8/10 | 6.5/10 |
| Web脆弱性対策 | 7/10 | 7/10 | 7/10 |
| ログ・監査 | 6/10 | 7/10 | 6.5/10 |
| **総合スコア** | **6/10** | **8/10** | **7/10** |

---

## 🎯 推奨アクションプラン

### Week 1: CRITICAL対応

1. OAuth CSRF保護強化（フロントエンド）
2. セキュリティヘッダー追加（バックエンド）
3. ディープリンク検証強化（フロントエンド）

### Week 2: HIGH対応

4. クライアント側Rate Limiting（フロントエンド）
5. Origin検証（バックエンド）
6. セキュリティイベントログ（バックエンド）

### Week 3-4: セキュリティ監査

7. OWASP ZAPスキャン実施
8. 侵入テスト
9. 脆弱性修正

---

**作成日**: 2025-11-21
**次回レビュー**: 本番公開前 + 公開後3ヶ月ごと
