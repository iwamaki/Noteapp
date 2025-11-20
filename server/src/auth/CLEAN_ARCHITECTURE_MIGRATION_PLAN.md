# Auth Module - Clean Architecture Migration Plan

## 概要
`server/src/auth`フォルダをクリーンアーキテクチャに移行する。
`server/src/billing`フォルダの構造を参考に実装する。

## 目標ディレクトリ構造

```
server/src/auth/
├── domain/
│   ├── __init__.py
│   └── entities/
│       └── __init__.py (billingのエンティティを参照)
├── application/
│   ├── __init__.py
│   └── services/
│       ├── __init__.py
│       ├── auth_service.py (service.py を移行)
│       ├── jwt_service.py (jwt_utils.py を移行)
│       └── oauth_service.py (google_oauth_flow.py を移行)
├── infrastructure/
│   ├── __init__.py
│   ├── config/
│   │   ├── __init__.py
│   │   └── constants.py (JWT設定、OAuth設定など)
│   └── external/
│       ├── __init__.py
│       ├── google_oauth_client.py (OAuth外部API呼び出し)
│       └── secret_manager_client.py (Secret Manager呼び出し)
├── presentation/
│   ├── __init__.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── request_schemas.py (schemas.py から分離)
│   │   └── response_schemas.py (schemas.py から分離)
│   └── router.py (device_router, token_router, oauth_router を統合)
└── __init__.py (公開API)
```

## 移行チェックリスト

### Phase 1: ディレクトリ構造作成
- [ ] `domain/entities/` ディレクトリ作成
- [ ] `application/services/` ディレクトリ作成
- [ ] `infrastructure/config/` ディレクトリ作成
- [ ] `infrastructure/external/` ディレクトリ作成
- [ ] `presentation/schemas/` ディレクトリ作成

### Phase 2: Domain層の整理
- [ ] `domain/__init__.py` 作成 (billingのエンティティを再エクスポート)
- [ ] `domain/entities/__init__.py` 作成 (User, DeviceAuth, Credit)

### Phase 3: Application層の移行
- [ ] `application/services/auth_service.py` 作成
  - 元ファイル: `service.py`
  - クラス: `AuthService`
  - メソッド: register_device, get_user_id_by_device, verify_device_user, logout, get_user_devices, delete_device, update_device_info

- [ ] `application/services/jwt_service.py` 作成
  - 元ファイル: `jwt_utils.py`
  - 関数: create_access_token, create_refresh_token, verify_token, get_user_id_from_token, get_device_id_from_token
  - Secret Manager関連ロジックをinfrastructureに移動

- [ ] `application/services/oauth_service.py` 作成
  - 元ファイル: `google_oauth_flow.py`
  - クラス: `OAuthService`
  - メソッド: start_auth_flow, exchange_code, get_user_info
  - 外部API呼び出しをinfrastructureに委譲

- [ ] `application/services/__init__.py` 作成 (サービスを公開)
- [ ] `application/__init__.py` 作成

### Phase 4: Infrastructure層の移行
- [ ] `infrastructure/config/constants.py` 作成
  - JWT設定 (ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS)
  - OAuth設定 (AUTH_URI, TOKEN_URI, USERINFO_URI)

- [ ] `infrastructure/external/secret_manager_client.py` 作成
  - Secret Manager からJWT_SECRET_KEY取得ロジック
  - 元ファイル: `jwt_utils.py` の `_get_secret_from_secret_manager`, `load_jwt_secret`, `validate_jwt_secret`

- [ ] `infrastructure/external/google_oauth_client.py` 作成
  - Google OAuth API呼び出し
  - 元ファイル: `google_oauth_flow.py` の requests呼び出し部分

- [ ] `infrastructure/config/__init__.py` 作成
- [ ] `infrastructure/external/__init__.py` 作成
- [ ] `infrastructure/__init__.py` 作成

### Phase 5: Presentation層の移行
- [ ] `presentation/schemas/request_schemas.py` 作成
  - 元ファイル: `schemas.py`
  - スキーマ: DeviceRegisterRequest, VerifyDeviceRequest, RefreshTokenRequest, GoogleAuthStartRequest, LogoutRequest

- [ ] `presentation/schemas/response_schemas.py` 作成
  - 元ファイル: `schemas.py`
  - スキーマ: DeviceRegisterResponse, VerifyDeviceResponse, RefreshTokenResponse, GoogleAuthStartResponse, LogoutResponse, DeviceInfo, DeviceListResponse, DeleteDeviceResponse, ErrorResponse

- [ ] `presentation/router.py` 作成 (統合ルーター)
  - 元ファイル: `device_router.py`, `token_router.py`, `oauth_router.py`, `router.py`
  - 全エンドポイントを1つのファイルに統合
  - または、billing同様にサブルーターとして分離も可

- [ ] `presentation/schemas/__init__.py` 作成
- [ ] `presentation/__init__.py` 作成

### Phase 6: 依存関係の整理
- [ ] `dependencies.py` を `presentation/dependencies.py` に移動
- [ ] インポートパスを新しいクリーンアーキテクチャに更新
  - `from src.auth.service import ...` → `from src.auth.application.services import ...`
  - `from src.auth.jwt_utils import ...` → `from src.auth.application.services import ...`
  - `from src.auth.schemas import ...` → `from src.auth.presentation.schemas import ...`

### Phase 7: ルートレベルの__init__.py作成
- [ ] `auth/__init__.py` 作成
  - 公開APIをエクスポート
  - 例: `from .application.services import AuthService, JWTService, OAuthService`
  - 例: `from .presentation.router import router`
  - 例: `from .presentation.schemas import *`

### Phase 8: 既存ファイルのimport更新
- [ ] `server/src/main.py` のインポート更新
  - `from src.auth.router import router` → `from src.auth.presentation.router import router`

- [ ] `server/src/billing/presentation/router.py` のインポート更新 (もし参照があれば)
  - `from src.auth.dependencies import ...` → `from src.auth.presentation.dependencies import ...`

### Phase 9: レガシーファイルのアーカイブ
- [ ] `_legacy/` フォルダを作成
- [ ] 以下のファイルを `_legacy/` に移動:
  - `service.py`
  - `jwt_utils.py`
  - `google_oauth_flow.py`
  - `schemas.py`
  - `device_router.py`
  - `token_router.py`
  - `oauth_router.py`
  - `router.py` (元の統合ルーター)
  - `oauth_state_manager.py` (必要に応じて)
  - `token_blacklist_manager.py` (必要に応じて)

### Phase 10: テストと検証
- [ ] サーバー起動確認
- [ ] 各エンドポイントの動作確認
  - POST `/api/auth/register`
  - POST `/api/auth/verify`
  - POST `/api/auth/token/refresh`
  - POST `/api/auth/logout`
  - GET `/api/auth/devices`
  - DELETE `/api/auth/devices/{device_id}`
  - GET `/api/auth/oauth/start`
  - GET `/api/auth/oauth/callback`
- [ ] インポートエラーがないか確認

## 注意事項
1. **エンティティの重複を避ける**: `DeviceAuth`, `User`, `Credit` はすでに `billing/domain/entities` に存在するため、再定義せずインポートして使用する
2. **段階的な移行**: 一度に全てを移行せず、レイヤーごとに段階的に実施
3. **後方互換性**: 移行中は既存のインポートパスも動作するようにする
4. **テストの実施**: 各フェーズ完了後、必ず動作確認を行う

## billingフォルダとの構造の違い
- billingは完全に独立したドメインエンティティを持つ
- authはbillingのエンティティ(User, DeviceAuth, Credit)を参照する
- authのdomain層はシンプルな再エクスポートのみ

## 移行後の利点
1. **責務の明確化**: プレゼンテーション層、アプリケーション層、インフラ層が明確に分離
2. **テスタビリティ向上**: 各層を独立してテスト可能
3. **保守性向上**: ビジネスロジックと技術詳細が分離され、変更が容易
4. **一貫性**: billingモジュールと同じアーキテクチャで統一
