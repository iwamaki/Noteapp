# テスト戦略・実装ガイド

**優先度**: 🔴 CRITICAL
**推定作業期間**: 2-3週間
**目標カバレッジ**: 最低80%

## 📊 現状

**フロントエンド**: テストファイル 0件 ❌
**バックエンド**: テストファイル 0件 ❌

**設定状況**:
- ✅ Jest設定済み（フロントエンド）
- ✅ pytest設定済み（バックエンド）
- ✅ Testing library インストール済み
- ❌ テスト実装なし

---

## 🎯 テスト戦略の目標

### 1. 品質保証
- リグレッション防止
- バグの早期発見
- リファクタリングの安全性

### 2. ドキュメント化
- コードの振る舞いを文書化
- 仕様の明確化

### 3. 開発効率
- 手動テストの削減
- CI/CDパイプライン構築

---

## 📁 テスト構成

### テストディレクトリ構造

#### フロントエンド
```
app/
├── __tests__/                    # テストルート
│   ├── unit/                     # ユニットテスト
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── components/
│   │   ├── stores/
│   │   └── utils/
│   ├── integration/              # 統合テスト
│   │   ├── auth-flow/
│   │   ├── file-operations/
│   │   └── billing-flow/
│   ├── e2e/                      # E2Eテスト
│   │   ├── user-journey/
│   │   └── critical-paths/
│   └── setup/                    # テストセットアップ
│       ├── jest.setup.ts
│       ├── mocks.ts
│       └── test-utils.tsx
```

#### バックエンド
```
server/
├── tests/                        # テストルート
│   ├── unit/                     # ユニットテスト
│   │   ├── auth/
│   │   ├── billing/
│   │   └── llm_clean/
│   ├── integration/              # 統合テスト
│   │   ├── api/
│   │   └── database/
│   ├── e2e/                      # E2Eテスト
│   │   └── flows/
│   └── fixtures/                 # テストフィクスチャ
│       ├── __init__.py
│       ├── database.py
│       └── users.py
```

---

## 🔧 テスト環境セットアップ

### フロントエンド (React Native + Jest)

#### 1. Jest設定

**ファイル**: `jest.config.js`（既存）

```javascript
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/app/__tests__/setup/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/__tests__/**',
    '!app/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

#### 2. テストセットアップファイル

**ファイル**: `app/__tests__/setup/jest.setup.ts`（新規作成）

```typescript
import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      apiBaseUrl: 'http://localhost:8000',
    },
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Silence the warning: Animated: `useNativeDriver` is not supported
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Global test timeout
jest.setTimeout(10000);
```

#### 3. テストユーティリティ

**ファイル**: `app/__tests__/setup/test-utils.tsx`（新規作成）

```typescript
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

// Wrapper with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <NavigationContainer>
      {children}
    </NavigationContainer>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react-native';
export { customRender as render };
```

---

### バックエンド (Python + pytest)

#### 1. pytest設定

**ファイル**: `server/pyproject.toml`（既存に追加）

```toml
[tool.pytest.ini_options]
pythonpath = ["src"]
testpaths = ["tests"]
asyncio_mode = "auto"
addopts = [
    "--strict-markers",
    "--cov=src",
    "--cov-report=term-missing",
    "--cov-report=html",
    "--cov-report=xml",
    "-v",
]
markers = [
    "unit: Unit tests",
    "integration: Integration tests",
    "e2e: End-to-end tests",
    "slow: Slow running tests",
]
```

#### 2. テストフィクスチャ

**ファイル**: `server/tests/conftest.py`（新規作成）

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from src.main import app
from src.billing.infrastructure.persistence.database import Base, get_db
from src.core.config import Settings

# テスト用データベース（In-Memory SQLite）
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def test_db():
    """テスト用データベースセッション"""
    engine = create_engine(
        SQLALCHEMY_TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # テーブル作成
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(test_db):
    """テスト用FastAPIクライアント"""
    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def sample_user(test_db):
    """テスト用ユーザー"""
    from src.billing.domain.entities.user import User
    from datetime import datetime

    user = User(
        user_id="test-user-123",
        email="test@example.com",
        display_name="Test User",
        created_at=datetime.utcnow()
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture
def auth_headers(sample_user):
    """認証ヘッダー"""
    from src.auth.application.services.jwt_service import create_access_token

    token = create_access_token(
        user_id=sample_user.user_id,
        device_id="test-device-123"
    )
    return {"Authorization": f"Bearer {token}"}
```

---

## 🧪 ユニットテストの実装

### フロントエンド: ユニットテスト例

#### 1. Store (Zustand) テスト

**ファイル**: `app/__tests__/unit/stores/authStore.test.ts`（新規作成）

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/auth/authStore';

// Mock SecureStore
jest.mock('expo-secure-store');

describe('authStore', () => {
  beforeEach(() => {
    // Reset store
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should set authentication state on successful login', async () => {
      const mockTokens = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      };

      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.login(mockTokens);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.accessToken).toBe(mockTokens.access_token);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'access_token',
        mockTokens.access_token
      );
    });

    it('should throw error on SecureStore failure', async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const { result } = renderHook(() => useAuthStore());

      await expect(
        act(async () => {
          await result.current.login({
            access_token: 'token',
            refresh_token: 'refresh',
          });
        })
      ).rejects.toThrow('Storage error');
    });
  });

  describe('logout', () => {
    it('should clear authentication state', async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuthStore());

      // Set initial authenticated state
      act(() => {
        result.current.isAuthenticated = true;
        result.current.accessToken = 'token';
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.accessToken).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('access_token');
    });
  });
});
```

#### 2. API Client テスト

**ファイル**: `app/__tests__/unit/features/api/HttpClient.test.ts`（新規作成）

```typescript
import axios from 'axios';
import { HttpClient } from '@/features/api/clients/HttpClient';
import { useAuthStore } from '@/auth/authStore';

jest.mock('axios');
jest.mock('@/auth/authStore');

describe('HttpClient', () => {
  let httpClient: HttpClient;
  const mockAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    httpClient = new HttpClient('http://localhost:8000');
    jest.clearAllMocks();
  });

  describe('request interceptor', () => {
    it('should add Authorization header with access token', async () => {
      const mockAccessToken = 'mock-access-token';
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        accessToken: mockAccessToken,
      });

      mockAxios.create.mockReturnValue({
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() },
        },
        get: jest.fn(),
      } as any);

      // Simulate interceptor
      const config = { headers: {} };
      const interceptor = mockAxios.create().interceptors.request.use;
      const requestInterceptor = (interceptor as jest.Mock).mock.calls[0][0];

      const modifiedConfig = requestInterceptor(config);

      expect(modifiedConfig.headers.Authorization).toBe(
        `Bearer ${mockAccessToken}`
      );
    });
  });

  describe('response interceptor', () => {
    it('should refresh token on 401 error', async () => {
      const mockRefreshToken = jest.fn().mockResolvedValue('new-token');
      (useAuthStore.getState as jest.Mock).mockReturnValue({
        refreshToken: mockRefreshToken,
      });

      // Test 401 handling
      const error = {
        response: { status: 401 },
        config: { url: '/api/test' },
      };

      // Should trigger token refresh
      expect(mockRefreshToken).toHaveBeenCalled();
    });
  });
});
```

#### 3. Component テスト

**ファイル**: `app/__tests__/unit/components/FileListItem.test.tsx`（新規作成）

```typescript
import React from 'react';
import { render, fireEvent } from '../setup/test-utils';
import { FileListItem } from '@/components/FileListItem';

describe('FileListItem', () => {
  const mockFile = {
    id: '1',
    title: 'Test Note',
    content: 'Test content',
    updatedAt: new Date('2025-01-01'),
  };

  const mockOnPress = jest.fn();
  const mockOnLongPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render file title and date', () => {
    const { getByText } = render(
      <FileListItem
        file={mockFile}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    expect(getByText('Test Note')).toBeTruthy();
    expect(getByText(/2025-01-01/)).toBeTruthy();
  });

  it('should call onPress when tapped', () => {
    const { getByTestId } = render(
      <FileListItem
        file={mockFile}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    fireEvent.press(getByTestId('file-list-item'));

    expect(mockOnPress).toHaveBeenCalledWith(mockFile);
  });

  it('should call onLongPress when long pressed', () => {
    const { getByTestId } = render(
      <FileListItem
        file={mockFile}
        onPress={mockOnPress}
        onLongPress={mockOnLongPress}
      />
    );

    fireEvent(getByTestId('file-list-item'), 'onLongPress');

    expect(mockOnLongPress).toHaveBeenCalledWith(mockFile);
  });
});
```

---

### バックエンド: ユニットテスト例

#### 1. Service テスト

**ファイル**: `server/tests/unit/billing/test_billing_service.py`（新規作成）

```python
import pytest
from datetime import datetime
from src.billing.application.services.billing_service import BillingService
from src.billing.domain.entities.credit import Credit
from src.billing.domain.entities.token_balance import TokenBalance

@pytest.mark.unit
class TestBillingService:
    """BillingServiceのユニットテスト"""

    def test_get_balance_success(self, test_db, sample_user):
        """残高取得の正常系"""
        # Setup
        credit = Credit(
            user_id=sample_user.user_id,
            credits=1000,
            created_at=datetime.utcnow()
        )
        test_db.add(credit)
        test_db.commit()

        service = BillingService(test_db, sample_user.user_id)

        # Execute
        balance = service.get_balance()

        # Assert
        assert balance["credits"] == 1000
        assert "allocated_tokens" in balance

    def test_add_credits_success(self, test_db, sample_user):
        """クレジット追加の正常系"""
        # Setup
        credit = Credit(
            user_id=sample_user.user_id,
            credits=100,
            created_at=datetime.utcnow()
        )
        test_db.add(credit)
        test_db.commit()

        service = BillingService(test_db, sample_user.user_id)
        purchase_record = {
            "productId": "credits_500",
            "purchaseToken": "mock-token",
            "orderId": "GPA.1234"
        }

        # Execute
        result = service.add_credits(500, purchase_record)

        # Assert
        assert result["success"] is True
        test_db.refresh(credit)
        assert credit.credits == 600

    def test_add_credits_with_duplicate_transaction(self, test_db, sample_user):
        """重複トランザクションの検証"""
        from src.billing.domain.entities.transaction import Transaction

        # Setup - 既存のトランザクション
        existing_tx = Transaction(
            transaction_id="GPA.1234",
            user_id=sample_user.user_id,
            type="purchase",
            amount=500,
            created_at=datetime.utcnow()
        )
        test_db.add(existing_tx)
        test_db.commit()

        service = BillingService(test_db, sample_user.user_id)
        purchase_record = {
            "orderId": "GPA.1234"
        }

        # Execute & Assert
        with pytest.raises(ValueError, match="already processed"):
            service.add_credits(500, purchase_record)

    def test_allocate_credits_insufficient_balance(self, test_db, sample_user):
        """不足残高での割り当て"""
        # Setup
        credit = Credit(
            user_id=sample_user.user_id,
            credits=10,
            created_at=datetime.utcnow()
        )
        test_db.add(credit)
        test_db.commit()

        service = BillingService(test_db, sample_user.user_id)
        allocations = [
            {"model_id": "gpt-4", "credits": 100}
        ]

        # Execute & Assert
        with pytest.raises(ValueError, match="Insufficient credits"):
            service.allocate_credits(allocations)
```

#### 2. JWT Service テスト

**ファイル**: `server/tests/unit/auth/test_jwt_service.py`（新規作成）

```python
import pytest
from datetime import datetime, timedelta
from src.auth.application.services.jwt_service import (
    create_access_token,
    create_refresh_token,
    verify_token,
    TokenType
)

@pytest.mark.unit
class TestJWTService:
    """JWT Serviceのユニットテスト"""

    def test_create_access_token(self):
        """Access Token生成"""
        user_id = "test-user-123"
        device_id = "test-device-456"

        token = create_access_token(user_id, device_id)

        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_access_token_success(self):
        """Access Token検証 - 正常系"""
        user_id = "test-user-123"
        device_id = "test-device-456"

        token = create_access_token(user_id, device_id)
        payload = verify_token(token, TokenType.ACCESS)

        assert payload["sub"] == user_id
        assert payload["device_id"] == device_id
        assert payload["type"] == "access"

    def test_verify_token_expired(self):
        """期限切れトークンの検証"""
        import jwt
        from src.core.config import get_settings

        settings = get_settings()

        # 期限切れトークン生成
        payload = {
            "sub": "test-user",
            "device_id": "test-device",
            "type": "access",
            "exp": datetime.utcnow() - timedelta(hours=1),
            "iat": datetime.utcnow() - timedelta(hours=2)
        }
        expired_token = jwt.encode(
            payload,
            settings.jwt_secret_key,
            algorithm="HS256"
        )

        # Assert
        with pytest.raises(ValueError, match="expired"):
            verify_token(expired_token, TokenType.ACCESS)

    def test_verify_token_invalid_type(self):
        """不正なトークンタイプ"""
        access_token = create_access_token("user", "device")

        # Access tokenをRefreshとして検証（エラー）
        with pytest.raises(ValueError, match="Invalid token type"):
            verify_token(access_token, TokenType.REFRESH)
```

---

## 🔗 統合テストの実装

### フロントエンド: 統合テスト例

**ファイル**: `app/__tests__/integration/auth-flow/login.test.ts`（新規作成）

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import axios from 'axios';
import { useAuthStore } from '@/auth/authStore';
import { authApiClient } from '@/auth/authApiClient';

jest.mock('axios');

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should complete full login flow', async () => {
    const mockDevice = {
      device_id: 'test-device-123',
    };

    const mockTokens = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    };

    // Mock API responses
    (axios.post as jest.Mock)
      .mockResolvedValueOnce({ data: mockDevice }) // Register
      .mockResolvedValueOnce({ data: mockTokens }); // Login

    const { result } = renderHook(() => useAuthStore());

    // Step 1: Register device
    await act(async () => {
      await authApiClient.registerDevice(mockDevice.device_id);
    });

    // Step 2: Login
    await act(async () => {
      await result.current.login(mockTokens);
    });

    // Assert
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.accessToken).toBe(mockTokens.access_token);
  });
});
```

---

### バックエンド: 統合テスト例

**ファイル**: `server/tests/integration/api/test_auth_api.py`（新規作成）

```python
import pytest

@pytest.mark.integration
class TestAuthAPI:
    """認証APIの統合テスト"""

    def test_device_registration(self, client):
        """デバイス登録APIのテスト"""
        response = client.post(
            "/api/auth/register",
            json={"device_id": "test-device-12345678-1234-4123-8123-123456789012"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "device_id" in data

    def test_token_refresh_flow(self, client, sample_user, auth_headers):
        """トークンリフレッシュフロー"""
        from src.auth.application.services.jwt_service import create_refresh_token

        # Refresh token生成
        refresh_token = create_refresh_token(
            sample_user.user_id,
            "test-device-123"
        )

        # Token refresh
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_full_auth_flow(self, client):
        """完全な認証フロー"""
        # Step 1: Device registration
        register_response = client.post(
            "/api/auth/register",
            json={"device_id": "test-device-12345678-1234-4123-8123-123456789012"}
        )
        assert register_response.status_code == 200
        user_data = register_response.json()

        # Step 2: Get devices (with auth)
        # ... (実装)

        # Step 3: Logout
        # ... (実装)
```

---

## 🌐 E2Eテストの実装

### バックエンド: E2Eテスト例

**ファイル**: `server/tests/e2e/test_billing_flow.py`（新規作成）

```python
import pytest

@pytest.mark.e2e
class TestBillingE2E:
    """課金フローのE2Eテスト"""

    def test_complete_billing_flow(self, client, sample_user):
        """完全な課金フロー: 登録 → 購入 → 割り当て → 消費"""

        # 1. 残高確認（初期状態）
        # 2. クレジット購入
        # 3. トークン割り当て
        # 4. トークン消費
        # 5. 残高確認（最終状態）
        # 6. トランザクション履歴確認

        # ... (実装)
        pass
```

---

## 📊 テスト実装の優先順位

### Phase 1: Critical Path（Week 1）

**優先度**: 🔴 CRITICAL

#### フロントエンド
1. **認証フロー**
   - [ ] `authStore` テスト
   - [ ] `authApiClient` テスト
   - [ ] OAuth flow 統合テスト

2. **API Client**
   - [ ] `HttpClient` テスト
   - [ ] Token refresh テスト
   - [ ] Error handling テスト

#### バックエンド
1. **認証システム**
   - [ ] JWT Service テスト
   - [ ] Auth API 統合テスト
   - [ ] Token blacklist テスト

2. **課金システム**
   - [ ] BillingService テスト
   - [ ] IAP verification テスト
   - [ ] Transaction テスト

**推定作業**: 5-7日

---

### Phase 2: Core Features（Week 2）

**優先度**: 🟠 HIGH

#### フロントエンド
3. **ファイル操作**
   - [ ] File list store テスト
   - [ ] File operations テスト
   - [ ] Category management テスト

4. **エディタ**
   - [ ] Editor store テスト
   - [ ] History manager テスト
   - [ ] Auto-save テスト

#### バックエンド
3. **データベース**
   - [ ] Repository テスト
   - [ ] Transaction テスト
   - [ ] Data integrity テスト

4. **LLM統合**
   - [ ] Chat service テスト
   - [ ] WebSocket テスト
   - [ ] Token consumption テスト

**推定作業**: 5-7日

---

### Phase 3: UI & Edge Cases（Week 3）

**優先度**: 🟡 MEDIUM

5. **UI Components**
   - [ ] Component snapshot テスト
   - [ ] User interaction テスト

6. **Edge Cases**
   - [ ] Error scenarios
   - [ ] Network failures
   - [ ] Concurrent operations

**推定作業**: 3-5日

---

## 🚀 CI/CD統合

### GitHub Actions設定

**ファイル**: `.github/workflows/test.yml`（新規作成）

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: frontend

  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: cd server && pip install -r requirements.txt
      - run: cd server && pytest --cov=src --cov-report=xml
      - uses: codecov/codecov-action@v3
        with:
          files: ./server/coverage.xml
          flags: backend
```

---

## 📈 カバレッジ目標

### 最低目標（本番公開前）

| カテゴリー | 目標カバレッジ |
|----------|-------------|
| 認証システム | 90%+ |
| 課金システム | 90%+ |
| API Clients | 85%+ |
| ファイル操作 | 80%+ |
| UI Components | 70%+ |
| **全体** | **80%+** |

### 長期目標（公開後3ヶ月）

- 全体カバレッジ: 90%+
- Critical path: 95%+

---

## 🛠️ テスト実行コマンド

### フロントエンド

```bash
# 全テスト実行
npm test

# Watch mode
npm test -- --watch

# カバレッジ付き
npm run test:coverage

# 特定のファイル
npm test -- auth

# 統合テストのみ
npm test -- integration
```

### バックエンド

```bash
# 全テスト実行
cd server && pytest

# カバレッジ付き
pytest --cov=src --cov-report=html

# 特定のマーカー
pytest -m unit
pytest -m integration
pytest -m e2e

# Verbose
pytest -v

# 並列実行
pytest -n auto
```

---

## 📚 テストのベストプラクティス

### 1. AAA パターン（Arrange, Act, Assert）

```typescript
it('should do something', () => {
  // Arrange - セットアップ
  const input = 'test';
  const expected = 'TEST';

  // Act - 実行
  const result = transform(input);

  // Assert - 検証
  expect(result).toBe(expected);
});
```

### 2. テストの独立性

- 各テストは独立して実行可能
- 他のテストの実行順序に依存しない
- beforeEach/afterEachで状態リセット

### 3. テスト名の明確化

```python
# Good
def test_add_credits_with_insufficient_balance_raises_error():
    ...

# Bad
def test_credits():
    ...
```

### 4. Mock の適切な使用

```typescript
// 外部依存のみMock
jest.mock('axios');

// 内部ロジックはMockしない（実際のコードをテスト）
```

---

## 🎯 成功指標

### テスト実装完了の定義

- [ ] 全Phase完了
- [ ] カバレッジ80%達成
- [ ] CI/CDパイプライン稼働
- [ ] 全テスト合格（グリーン）
- [ ] テストドキュメント作成

### 品質指標

- **テスト実行時間**: <5分（ユニット）
- **テスト成功率**: 100%
- **False Positive**: 0件
- **テストメンテナンス時間**: 開発時間の<10%

---

**作成日**: 2025-11-21
**更新予定**: Phase完了ごと
