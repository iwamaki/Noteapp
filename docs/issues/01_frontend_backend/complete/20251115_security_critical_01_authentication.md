---
filename: 20251115_security_critical_01_authentication
status: new
priority: high
attempt_count: 0
tags: [security, critical, authentication, password, MFA]
date: 2025/11/15
---

## 概要 (Overview)

現在の認証システムは、デバイスID (UUID) のみで認証を行い、パスワードが一切不要です。デバイスIDが漏洩した場合、攻撃者は即座にアカウントを乗っ取ることができる致命的な脆弱性が存在します。

**脆弱性分類:**
- **CWE-287:** Improper Authentication
- **CVSS Score:** 9.8 (Critical)
- **影響:** 全ユーザーのアカウント乗っ取りリスク

## 背景 (Background)

### 現在の認証フロー

1. アプリ起動時、`expo-application`でデバイスID (UUID) を生成
2. `/auth/device/register`エンドポイントにデバイスIDを送信
3. サーバーはデバイスIDのみでユーザーを識別・認証
4. パスワード、PIN、生体認証などの追加認証は一切なし

### 脆弱なコード

**フロントエンド (アプリ側):**
```typescript
// app/(auth)/AuthService.ts
async register(): Promise<void> {
  const deviceId = await this.getDeviceId(); // UUIDを取得
  const response = await api.post('/auth/device/register', { device_id: deviceId });
  // これだけでログイン完了
}

async getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync('device_id');
  if (!deviceId) {
    deviceId = Application.androidId || generateUUID();
    await SecureStore.setItemAsync('device_id', deviceId);
  }
  return deviceId;
}
```

**バックエンド (サーバー側):**
```python
# server/src/auth/service.py:30-70
class DeviceAuthService:
    def register_device(self, device_id: str) -> Tuple[str, bool]:
        # デバイスIDが存在するか確認
        existing_device = self.db.query(DeviceAuth).filter_by(
            device_id=device_id
        ).first()

        if existing_device:
            # 既存デバイス → そのままログイン（パスワード不要）
            existing_device.last_login_at = datetime.now()
            self.db.commit()
            return existing_device.user_id, False
        else:
            # 新規デバイス → 新規ユーザー作成
            user_id = str(uuid.uuid4())
            new_device = DeviceAuth(
                device_id=device_id,
                user_id=user_id,
                created_at=datetime.now(),
                last_login_at=datetime.now()
            )
            self.db.add(new_device)
            self.db.commit()
            return user_id, True
```

### なぜこれが問題なのか？

1. **認証要素が1つのみ:**
   - 通常の認証: 「何を知っているか」(パスワード) + 「何を持っているか」(デバイス)
   - 現在: 「何を持っているか」(デバイスID) のみ

2. **デバイスIDは秘密情報ではない:**
   - ログファイルに記録される可能性
   - 通信ログから傍受可能
   - アプリのバグで画面に表示される可能性
   - ソーシャルエンジニアリングで取得可能

3. **取り消し・無効化の手段がない:**
   - デバイスIDが漏洩しても、ユーザーは無効化できない
   - パスワード変更のような対応策がない

## 攻撃シナリオ (Attack Scenarios)

### シナリオ1: ログファイルからの漏洩

1. 開発中、デバッグログにデバイスIDが出力される
```
[DEBUG] Registering device: device_id=550e8400-e29b-41d4-a716-446655440000
```

2. ログがGitHubやSentryなどに送信される

3. 攻撃者がログを閲覧し、デバイスIDを取得

4. 攻撃者が自分のアプリで該当デバイスIDを設定:
```typescript
await SecureStore.setItemAsync('device_id', '550e8400-e29b-41d4-a716-446655440000');
```

5. アプリ起動 → 被害者のアカウントに即座にログイン成功

### シナリオ2: 中間者攻撃 (MITM)

1. ユーザーが公共Wi-Fiでアプリを使用
2. 攻撃者がWi-Fiを傍受 (HTTPSが適切でない場合)
3. `/auth/device/register`リクエストを傍受:
```json
POST /auth/device/register
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000"
}
```
4. デバイスIDを取得し、アカウント乗っ取り

### シナリオ3: ソーシャルエンジニアリング

1. 攻撃者がサポート担当者を装い、ユーザーに連絡
2. 「アカウント移行のため、デバイスIDを教えてください」
3. ユーザーがアプリの設定画面などでデバイスIDを確認して教える
4. 攻撃者がそのデバイスIDでログイン

### シナリオ4: マルウェアによる窃取

1. ユーザーのスマートフォンがマルウェアに感染
2. マルウェアがSecureStoreから`device_id`を読み取り
3. 攻撃者のサーバーに送信
4. 攻撃者が別のデバイスでアカウント乗っ取り

## 実装方針 (Implementation Strategy)

### フェーズ1: パスワード認証の追加 (最優先)

**目標:** デバイスID + パスワードの2要素認証を実装

1. **データベーススキーマの拡張:**
```python
# server/src/auth/models.py
class UserAuth(Base):
    __tablename__ = "user_auth"

    user_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    password_hash = Column(String, nullable=False)  # bcryptハッシュ
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, onupdate=datetime.now)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)

class DeviceAuth(Base):
    __tablename__ = "device_auth"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("user_auth.user_id"), nullable=False)
    device_id = Column(String, unique=True, nullable=False, index=True)
    device_name = Column(String, nullable=True)  # "iPhone 13 Pro"
    last_login_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)
    is_trusted = Column(Boolean, default=False)  # 信頼済みデバイス
```

2. **新規ユーザー登録フロー:**
```python
# server/src/auth/service.py
import bcrypt

class AuthService:
    def register_user(
        self,
        username: str,
        password: str,
        email: Optional[str],
        device_id: str
    ) -> Dict:
        # ユーザー名の重複チェック
        if self.db.query(UserAuth).filter_by(username=username).first():
            raise ValueError("Username already exists")

        # パスワードのハッシュ化 (bcrypt)
        password_hash = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt(rounds=12)
        )

        # ユーザー作成
        user = UserAuth(
            username=username,
            password_hash=password_hash.decode('utf-8'),
            email=email
        )
        self.db.add(user)
        self.db.flush()

        # デバイスの登録
        device = DeviceAuth(
            user_id=user.user_id,
            device_id=device_id,
            is_trusted=True  # 登録時のデバイスは信頼済み
        )
        self.db.add(device)
        self.db.commit()

        return {
            "user_id": user.user_id,
            "username": user.username,
            "access_token": self.generate_jwt(user.user_id)
        }

    def login(self, username: str, password: str, device_id: str) -> Dict:
        # ユーザー取得
        user = self.db.query(UserAuth).filter_by(username=username).first()
        if not user or not user.is_active:
            raise ValueError("Invalid username or password")

        # パスワード検証
        if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
            # 失敗ログを記録（ブルートフォース検出用）
            self.log_failed_login(username, device_id)
            raise ValueError("Invalid username or password")

        # デバイスの確認・登録
        device = self.db.query(DeviceAuth).filter_by(
            user_id=user.user_id,
            device_id=device_id
        ).first()

        if not device:
            # 新しいデバイスからのログイン
            device = DeviceAuth(
                user_id=user.user_id,
                device_id=device_id,
                is_trusted=False  # 初回は未信頼
            )
            self.db.add(device)
            # メール通知: 「新しいデバイスからのログインがありました」

        device.last_login_at = datetime.now()
        self.db.commit()

        return {
            "user_id": user.user_id,
            "username": user.username,
            "access_token": self.generate_jwt(user.user_id),
            "is_new_device": not device.is_trusted
        }
```

3. **フロントエンド実装:**
```typescript
// app/(auth)/screens/LoginScreen.tsx
import React, { useState } from 'react';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const deviceId = await AuthService.getDeviceId();
    try {
      const response = await api.post('/auth/login', {
        username,
        password,
        device_id: deviceId,
      });

      // トークンを保存
      await SecureStore.setItemAsync('access_token', response.data.access_token);
      await SecureStore.setItemAsync('user_id', response.data.user_id);

      // ホーム画面に遷移
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('ログイン失敗', 'ユーザー名またはパスワードが正しくありません');
    }
  };

  return (
    <View>
      <TextInput
        placeholder="ユーザー名"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="ログイン" onPress={handleLogin} />
    </View>
  );
}
```

### フェーズ2: JWT認証の実装

**目標:** デバイスIDをそのまま使うのではなく、JWTトークンを発行

```python
# server/src/auth/service.py
import jwt
from datetime import datetime, timedelta

class AuthService:
    def generate_jwt(self, user_id: str) -> str:
        payload = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(days=30),  # 30日有効
            "iat": datetime.utcnow(),
        }
        token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
        return token

    def verify_jwt(self, token: str) -> str:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
            return payload["user_id"]
        except jwt.ExpiredSignatureError:
            raise ValueError("Token expired")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid token")
```

**依存関係の追加:**
```python
# server/src/auth/dependencies.py
from fastapi import Depends, HTTPException, Header

async def verify_token(authorization: str = Header(...)) -> str:
    """JWTトークンを検証し、user_idを返す"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid authorization header")

    token = authorization[7:]  # "Bearer "を除去
    try:
        auth_service = AuthService(db=next(get_db()))
        user_id = auth_service.verify_jwt(token)
        return user_id
    except ValueError as e:
        raise HTTPException(401, str(e))

# 既存のverify_user()を置き換え
async def verify_user(user_id: str = Depends(verify_token)) -> str:
    return user_id
```

### フェーズ3: リフレッシュトークンの実装

**目標:** アクセストークンの有効期限を短くし、リフレッシュトークンで更新

```python
class AuthService:
    def generate_tokens(self, user_id: str) -> Dict:
        # アクセストークン (15分)
        access_token = jwt.encode({
            "user_id": user_id,
            "type": "access",
            "exp": datetime.utcnow() + timedelta(minutes=15),
        }, settings.JWT_SECRET, algorithm="HS256")

        # リフレッシュトークン (30日)
        refresh_token = jwt.encode({
            "user_id": user_id,
            "type": "refresh",
            "exp": datetime.utcnow() + timedelta(days=30),
        }, settings.JWT_SECRET, algorithm="HS256")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
        }

    def refresh_access_token(self, refresh_token: str) -> str:
        try:
            payload = jwt.decode(refresh_token, settings.JWT_SECRET, algorithms=["HS256"])
            if payload.get("type") != "refresh":
                raise ValueError("Invalid token type")

            user_id = payload["user_id"]
            # 新しいアクセストークンを生成
            return self.generate_jwt(user_id)
        except jwt.ExpiredSignatureError:
            raise ValueError("Refresh token expired. Please login again.")
        except jwt.InvalidTokenError:
            raise ValueError("Invalid refresh token")
```

### フェーズ4: 多要素認証 (MFA) の準備

**目標:** TOTP (Time-based One-Time Password) による2段階認証

```python
# server/src/auth/models.py
class UserAuth(Base):
    # ...
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String, nullable=True)  # TOTP秘密鍵

# server/src/auth/service.py
import pyotp

class AuthService:
    def enable_mfa(self, user_id: str) -> Dict:
        user = self.db.query(UserAuth).filter_by(user_id=user_id).first()
        if not user:
            raise ValueError("User not found")

        # TOTP秘密鍵を生成
        secret = pyotp.random_base32()
        user.mfa_secret = secret
        user.mfa_enabled = True
        self.db.commit()

        # QRコード用のURL生成
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.username,
            issuer_name="YourAppName"
        )

        return {
            "secret": secret,
            "qr_uri": totp_uri,
        }

    def verify_mfa_code(self, user_id: str, code: str) -> bool:
        user = self.db.query(UserAuth).filter_by(user_id=user_id).first()
        if not user or not user.mfa_enabled:
            return False

        totp = pyotp.TOTP(user.mfa_secret)
        return totp.verify(code, valid_window=1)  # ±30秒の猶予
```

### 既存ユーザーの移行戦略

**問題:** 既存ユーザーはデバイスIDのみで登録されており、ユーザー名/パスワードがありません。

**解決策:**

1. **強制的なアカウント移行フロー:**
```typescript
// app/(auth)/MigrationScreen.tsx
export default function MigrationScreen() {
  // 既存のdevice_idを使用してサーバーに問い合わせ
  // → ユーザー名/パスワードの設定を促す
  // → 移行完了まで他の機能を使用不可

  return (
    <View>
      <Text>アカウントのセキュリティ強化のため、ユーザー名とパスワードの設定が必要です</Text>
      <TextInput placeholder="ユーザー名" />
      <TextInput placeholder="パスワード" secureTextEntry />
      <Button title="設定する" onPress={handleMigration} />
    </View>
  );
}
```

2. **サーバー側の移行API:**
```python
# server/src/auth/router.py
@router.post("/auth/migrate")
async def migrate_account(
    request: MigrateAccountRequest,
    db: Session = Depends(get_db)
):
    """既存のデバイスIDベースアカウントをユーザー名/パスワード認証に移行"""
    # device_idで既存ユーザーを特定
    device = db.query(DeviceAuth).filter_by(device_id=request.device_id).first()
    if not device:
        raise HTTPException(404, "Device not found")

    # 既にユーザー名が設定されている場合はエラー
    user = db.query(UserAuth).filter_by(user_id=device.user_id).first()
    if user:
        raise HTTPException(400, "Account already migrated")

    # 新しいユーザー認証情報を作成
    password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt())
    user = UserAuth(
        user_id=device.user_id,  # 既存のuser_idを使用
        username=request.username,
        password_hash=password_hash.decode(),
    )
    db.add(user)
    db.commit()

    return {"success": True, "message": "Migration completed"}
```

## 受け入れ条件 (Acceptance Criteria)

### フェーズ1完了条件
- [ ] `UserAuth`テーブルがマイグレーションで作成される
- [ ] 新規ユーザー登録時、ユーザー名とパスワードが必須
- [ ] パスワードはbcryptでハッシュ化され、平文で保存されない
- [ ] ログイン時、ユーザー名とパスワードの両方が検証される
- [ ] デバイスIDは認証後のセッション管理にのみ使用される
- [ ] 既存ユーザーに対して移行フローが表示される
- [ ] 移行完了まで他の機能が使用できない

### フェーズ2完了条件
- [ ] JWT認証が実装され、`Authorization: Bearer <token>`ヘッダーで認証される
- [ ] JWTの有効期限が30日に設定される
- [ ] トークンの検証が全てのprotectedエンドポイントで行われる
- [ ] トークンが無効または期限切れの場合、401エラーが返される

### フェーズ3完了条件
- [ ] リフレッシュトークンが発行される
- [ ] アクセストークンの有効期限が15分に設定される
- [ ] `/auth/refresh`エンドポイントで新しいアクセストークンを取得できる
- [ ] フロントエンドで自動的なトークンリフレッシュが実装される

### フェーズ4完了条件
- [ ] TOTP MFAが有効化できる
- [ ] QRコードでGoogle Authenticatorなどに登録できる
- [ ] ログイン時、MFA有効ユーザーはワンタイムコードの入力が必要
- [ ] バックアップコードが生成・保存される

### セキュリティ要件
- [ ] パスワードは最低8文字、大文字・小文字・数字を含む
- [ ] ログイン失敗時、ユーザー名の存在を推測できるメッセージを返さない
- [ ] ブルートフォース攻撃対策としてレートリミットが機能する
- [ ] パスワードリセット機能が実装される（メール認証）
- [ ] 新しいデバイスからのログイン時、メール通知が送信される

### テスト要件
- [ ] パスワード認証のユニットテスト
- [ ] JWT生成・検証のユニットテスト
- [ ] ブルートフォース攻撃の統合テスト
- [ ] 既存ユーザー移行のE2Eテスト
- [ ] MFA有効化・検証のテスト

## 関連ファイル (Related Files)

### バックエンド (サーバー)
- `server/src/auth/models.py` - データモデル定義
- `server/src/auth/service.py` - 認証ロジック
- `server/src/auth/router.py` - 認証エンドポイント
- `server/src/auth/dependencies.py` - 認証依存関係
- `server/src/auth/schemas.py` - リクエスト/レスポンススキーマ
- `server/src/core/config.py` - JWT_SECRET設定
- `server/alembic/versions/` - データベースマイグレーション

### フロントエンド (アプリ)
- `app/(auth)/AuthService.ts` - 認証サービス
- `app/(auth)/screens/LoginScreen.tsx` - ログイン画面
- `app/(auth)/screens/RegisterScreen.tsx` - 新規登録画面
- `app/(auth)/screens/MigrationScreen.tsx` - 移行画面
- `app/(auth)/contexts/AuthContext.tsx` - 認証状態管理
- `app/api/client.ts` - APIクライアント (トークン送信)

## 制約条件 (Constraints)

### 技術的制約
- **後方互換性:** 既存ユーザーのデータ（ノート、クレジット残高など）を失わない
- **ゼロダウンタイム:** サービスを停止せずにデプロイ可能にする
- **パフォーマンス:** パスワード検証は100ms以内
- **ライブラリ選定:**
  - パスワードハッシュ: `bcrypt` (Python) / `bcryptjs` (Node.js)
  - JWT: `PyJWT` (Python) / `jsonwebtoken` (Node.js)
  - TOTP: `pyotp` (Python) / `otplib` (Node.js)

### セキュリティ制約
- **OWASP準拠:** パスワードストレージチートシートに従う
- **NIST準拠:** パスワードポリシーはNIST SP 800-63Bに準拠
- **bcrypt rounds:** 最低12ラウンド（推奨は12-14）
- **JWT秘密鍵:** 最低256ビット（32文字）のランダム文字列
- **トークン保存:** フロントエンドではSecureStoreのみ使用

### UX制約
- **移行フロー:** 既存ユーザーの移行は1回のみ、スキップ不可
- **パスワード要件表示:** リアルタイムで強度を表示
- **エラーメッセージ:** 具体的すぎず、曖昧すぎない表現
- **オンボーディング:** 新規ユーザーには丁寧な説明

### 運用制約
- **段階的ロールアウト:** まずベータユーザー→全体に展開
- **ロールバックプラン:** 問題発生時の切り戻し手順を用意
- **モニタリング:** ログイン成功率、失敗率、移行完了率を追跡

## 開発ログ (Development Log)

---
### 試行 #0 (初回分析)

- **試みたこと:** セキュリティ監査でデバイスID認証の脆弱性を発見
- **結果:** CRITICAL脆弱性として分類、詳細なissueドキュメントを作成
- **メモ:** フェーズ1 (パスワード認証) を最優先で実装すべき

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- セキュリティ監査により、パスワード不要の認証システムがCRITICAL脆弱性と判定されました
- このissueドキュメントには、4つのフェーズに分けた実装計画が含まれています
- まだ実装は開始していません

### 次のアクション
1. **最優先:** フェーズ1 (パスワード認証) の実装を開始
   - データベースマイグレーションファイルの作成
   - `UserAuth`モデルの追加
   - 登録・ログインAPIの実装
   - フロントエンドの登録・ログイン画面作成

2. **並行作業:** 既存ユーザーの移行戦略の詳細化
   - 移行APIの実装
   - 移行画面のUI/UX設計
   - 移行完了率のトラッキング

3. **テスト:** 各フェーズ完了後にセキュリティテストを実施
   - ブルートフォース攻撃テスト
   - パスワードハッシュの安全性検証
   - JWT改ざん検出テスト

### 考慮事項/ヒント
- bcryptのrounds数は12以上にすること（14推奨）
- JWT_SECRETは絶対にハードコードせず、環境変数またはGCP Secret Managerから取得
- 既存のデバイスIDベース認証は、移行完了まで併用する必要がある（突然の変更はユーザー混乱を招く）
- パスワードリセット機能は、メールアドレスの収集が前提となるため、別途プライバシーポリシーの更新が必要

### 参考資料
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B (Digital Identity Guidelines)](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [bcrypt best practices](https://github.com/pyca/bcrypt/)
