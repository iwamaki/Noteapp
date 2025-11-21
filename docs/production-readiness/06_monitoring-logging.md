# モニタリング & ロギング実装ガイド

**優先度**: 🔴 CRITICAL
**推定作業期間**: 1週間
**対象**: ログ集約 + エラー追跡 + メトリクス収集 + アラート

## 📊 現状の課題

### 現在のロギング

**実装**: 構造化JSONロギング（stdout）
**ファイル**: `server/src/core/logger.py`

```python
# ログは標準出力のみ
logger.info("User logged in", extra={"user_id": user_id})
```

### 🚨 問題点

1. **ログの揮発性**
   - コンテナ再起動でログ消失
   - 検索・分析不可能

2. **可視性の欠如**
   - エラーの検知が遅れる
   - トレンド分析不可

3. **デバッグの困難さ**
   - 本番環境の問題追跡不可
   - ユーザー影響の把握不可

4. **アラートなし**
   - インシデント検知できない
   - 障害対応が後手に

---

## 🎯 実装する監視スタック

### アーキテクチャ

```
┌─────────────────┐
│   Application   │
│  (Frontend/     │
│   Backend)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────┐   ┌─────────┐
│Logs │   │ Errors  │
│     │   │ (Sentry)│
└──┬──┘   └─────────┘
   │
   ▼
┌──────────────────┐
│ GCP Cloud        │
│ Logging          │
└──────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│Metrics  │ │ Alerts  │
│(Prome-  │ │ (Email/ │
│ theus)  │ │ Slack)  │
└─────────┘ └─────────┘
```

### コンポーネント

1. **GCP Cloud Logging** - ログ集約・検索
2. **Sentry** - エラー追跡・スタックトレース
3. **Prometheus** - メトリクス収集
4. **Grafana** - ダッシュボード可視化（オプション）
5. **Alerting** - インシデント通知

---

## 📝 1. GCP Cloud Logging統合

### バックエンド統合

#### 1.1 依存関係インストール

```bash
cd server
pip install google-cloud-logging==3.9.0
```

**requirements.txt に追加**:
```
google-cloud-logging==3.9.0
```

#### 1.2 Cloud Logging設定

**ファイル**: `server/src/core/cloud_logger.py`（新規作成）

```python
"""GCP Cloud Logging統合"""
import logging
import os
from google.cloud import logging as cloud_logging
from google.cloud.logging.handlers import CloudLoggingHandler

def setup_cloud_logging():
    """Cloud Loggingセットアップ"""

    # 本番環境のみCloud Loggingを有効化
    environment = os.getenv("ENVIRONMENT", "development")
    if environment != "production":
        return

    try:
        # Cloud Logging クライアント
        client = cloud_logging.Client()

        # Cloud Logging ハンドラー
        handler = CloudLoggingHandler(client, name="noteapp-backend")

        # ルートロガーに追加
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)

        # 構造化ログフィールド追加
        handler.setFormatter(logging.Formatter(
            '%(message)s',
            defaults={
                'service': 'noteapp-backend',
                'environment': environment,
            }
        ))

        logging.info("Cloud Logging enabled")

    except Exception as e:
        logging.error(f"Failed to setup Cloud Logging: {e}")
        # フォールバック: 標準出力ロギング継続
```

#### 1.3 main.pyで初期化

**ファイル**: `server/src/main.py`

```python
from fastapi import FastAPI
from src.core.cloud_logger import setup_cloud_logging
import logging

# Cloud Logging初期化（本番環境のみ）
setup_cloud_logging()

logger = logging.getLogger(__name__)

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up", extra={
        "event": "startup",
        "service": "noteapp-backend"
    })
```

#### 1.4 構造化ログの活用

```python
# ユーザーアクション
logger.info(
    "User authenticated",
    extra={
        "event_type": "auth",
        "user_id": user_id,
        "device_id": device_id[:8] + "...",
        "method": "google_oauth"
    }
)

# エラー
logger.error(
    "Failed to process payment",
    extra={
        "event_type": "error",
        "user_id": user_id,
        "error_code": "PAYMENT_FAILED",
        "transaction_id": transaction_id
    },
    exc_info=True  # スタックトレース含む
)

# パフォーマンス
logger.info(
    "API request completed",
    extra={
        "event_type": "performance",
        "endpoint": "/api/billing/balance",
        "duration_ms": 150,
        "status_code": 200
    }
)
```

#### 1.5 Cloud Logging検索クエリ例

```
# エラーのみ
severity >= ERROR

# 特定ユーザーのログ
jsonPayload.user_id="test-user-123"

# 認証失敗
jsonPayload.event_type="auth" AND jsonPayload.status="failed"

# 遅いリクエスト（150ms以上）
jsonPayload.duration_ms >= 150

# 課金関連
jsonPayload.event_type="billing"
```

---

### フロントエンド統合

#### 1.6 Expo用ロギング

**ファイル**: `app/utils/cloudLogger.ts`（新規作成）

```typescript
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

interface LogContext {
  userId?: string;
  screen?: string;
  action?: string;
  [key: string]: any;
}

export class CloudLogger {
  private static isProduction = Constants.expoConfig?.extra?.environment === 'production';

  static info(message: string, context?: LogContext) {
    if (this.isProduction) {
      // Sentryのbreadcrumb（後述）
      Sentry.addBreadcrumb({
        category: 'info',
        message,
        level: 'info',
        data: context,
      });
    } else {
      console.log(message, context);
    }
  }

  static error(message: string, error: Error, context?: LogContext) {
    if (this.isProduction) {
      Sentry.captureException(error, {
        contexts: {
          custom: context,
        },
        tags: {
          screen: context?.screen,
          action: context?.action,
        },
      });
    } else {
      console.error(message, error, context);
    }
  }

  static setUser(userId: string, email?: string) {
    Sentry.setUser({ id: userId, email });
  }

  static clearUser() {
    Sentry.setUser(null);
  }
}
```

**使用例**:
```typescript
// 情報ログ
CloudLogger.info('User navigated to screen', {
  userId: user.id,
  screen: 'FileListScreen',
  action: 'navigation',
});

// エラーログ
try {
  await api.fetchFiles();
} catch (error) {
  CloudLogger.error('Failed to fetch files', error as Error, {
    userId: user.id,
    screen: 'FileListScreen',
    action: 'fetch_files',
  });
}

// ユーザー設定
CloudLogger.setUser(user.id, user.email);
```

---

## 🐛 2. Sentry統合（エラー追跡）

### 2.1 Sentryプロジェクト作成

1. https://sentry.io にアクセス
2. 新規プロジェクト作成
   - **Backend**: Python (FastAPI)
   - **Frontend**: React Native
3. DSN取得

---

### 2.2 バックエンド統合

#### インストール

```bash
cd server
pip install sentry-sdk[fastapi]==1.40.0
```

#### 設定

**ファイル**: `server/src/core/sentry_config.py`（新規作成）

```python
"""Sentry設定"""
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
import os

def init_sentry():
    """Sentry初期化"""
    environment = os.getenv("ENVIRONMENT", "development")

    # 本番環境のみ有効化
    if environment != "production":
        return

    sentry_dsn = os.getenv("SENTRY_DSN")
    if not sentry_dsn:
        return

    sentry_sdk.init(
        dsn=sentry_dsn,
        environment=environment,
        release=os.getenv("APP_VERSION", "unknown"),

        # パフォーマンス監視
        traces_sample_rate=0.1,  # 10%のトランザクションをサンプリング

        # Integrations
        integrations=[
            FastApiIntegration(transaction_style="url"),
            SqlalchemyIntegration(),
        ],

        # エラーフィルタリング
        before_send=before_send_filter,

        # プロファイリング（オプション）
        profiles_sample_rate=0.1,
    )

def before_send_filter(event, hint):
    """エラー送信前フィルタ"""

    # 特定のエラーを除外
    if 'exc_info' in hint:
        exc_type, exc_value, tb = hint['exc_info']

        # 404エラーは除外
        if isinstance(exc_value, HTTPException) and exc_value.status_code == 404:
            return None

    # 機密情報のマスキング
    if 'request' in event:
        if 'headers' in event['request']:
            # Authorization ヘッダーをマスク
            if 'Authorization' in event['request']['headers']:
                event['request']['headers']['Authorization'] = '[Filtered]'

    return event
```

#### main.pyで初期化

**ファイル**: `server/src/main.py`

```python
from src.core.sentry_config import init_sentry

# Sentry初期化（startup前）
init_sentry()

app = FastAPI()

# ... (既存のコード)
```

#### エラーキャプチャ例

```python
import sentry_sdk

try:
    result = billing_service.add_credits(credits, purchase_record)
except ValueError as e:
    # ビジネスロジックエラー - Sentryには送らない
    logger.warning(f"Business logic error: {e}")
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    # 予期しないエラー - Sentryに送る
    sentry_sdk.capture_exception(e)
    logger.error(f"Unexpected error: {e}", exc_info=True)
    raise HTTPException(status_code=500, detail="Internal server error")
```

---

### 2.3 フロントエンド統合

#### インストール

```bash
npm install @sentry/react-native
npx @sentry/wizard -i reactNative -p ios android
```

#### 設定

**ファイル**: `app/App.tsx`

```typescript
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Sentry初期化
Sentry.init({
  dsn: Constants.expoConfig?.extra?.sentryDsn,
  environment: Constants.expoConfig?.extra?.environment || 'development',

  // 本番環境のみ有効
  enabled: Constants.expoConfig?.extra?.environment === 'production',

  // トレーシング
  tracesSampleRate: 0.1,

  // ネイティブクラッシュレポート
  enableNative: true,

  // Breadcrumbsの設定
  maxBreadcrumbs: 100,

  // エラーフィルタリング
  beforeSend(event, hint) {
    // 開発環境では送信しない
    if (__DEV__) {
      return null;
    }

    // 機密情報のマスキング
    if (event.request?.headers?.Authorization) {
      event.request.headers.Authorization = '[Filtered]';
    }

    return event;
  },

  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
    }),
  ],
});

// エラーバウンダリー
const App = () => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <ErrorScreen error={error} onReset={resetError} />
      )}
    >
      <MainApp />
    </Sentry.ErrorBoundary>
  );
};

export default Sentry.wrap(App);
```

#### エラーキャプチャ例

```typescript
import * as Sentry from '@sentry/react-native';

// 手動キャプチャ
try {
  await api.fetchData();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      screen: 'FileListScreen',
      action: 'fetch_files',
    },
    contexts: {
      user: {
        id: userId,
      },
    },
  });
  throw error;
}

// Breadcrumbs（操作履歴）
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'Navigated to FileEditScreen',
  level: 'info',
  data: {
    fileId: file.id,
  },
});

// ユーザーコンテキスト
Sentry.setUser({
  id: user.id,
  email: user.email,
});

// カスタムタグ
Sentry.setTag('feature', 'file-editing');
Sentry.setContext('file', {
  id: file.id,
  size: file.size,
});
```

---

## 📊 3. Prometheus メトリクス収集

### 3.1 バックエンド統合

#### インストール

```bash
cd server
pip install prometheus-client==0.19.0
pip install prometheus-fastapi-instrumentator==6.1.0
```

#### 設定

**ファイル**: `server/src/core/metrics.py`（新規作成）

```python
"""Prometheusメトリクス"""
from prometheus_client import Counter, Histogram, Gauge
from prometheus_fastapi_instrumentator import Instrumentator
from fastapi import FastAPI
import time

# カウンター
auth_attempts_total = Counter(
    'auth_attempts_total',
    'Total authentication attempts',
    ['status', 'method']
)

billing_transactions_total = Counter(
    'billing_transactions_total',
    'Total billing transactions',
    ['type', 'status']
)

# ヒストグラム（レイテンシー）
request_duration_seconds = Histogram(
    'request_duration_seconds',
    'Request duration in seconds',
    ['endpoint', 'method', 'status']
)

# ゲージ（現在値）
active_users = Gauge(
    'active_users',
    'Number of active users'
)

token_balance_total = Gauge(
    'token_balance_total',
    'Total token balance',
    ['user_id', 'model_id']
)

def setup_metrics(app: FastAPI):
    """メトリクス設定"""

    # FastAPI instrumentator
    instrumentator = Instrumentator(
        should_group_status_codes=True,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics", "/health"],
        env_var_name="ENABLE_METRICS",
        inprogress_name="fastapi_inprogress",
        inprogress_labels=True,
    )

    instrumentator.instrument(app).expose(app, endpoint="/metrics")

    return instrumentator
```

#### main.pyで初期化

**ファイル**: `server/src/main.py`

```python
from src.core.metrics import setup_metrics

app = FastAPI()

# Prometheusメトリクス
setup_metrics(app)
```

#### メトリクス記録例

```python
from src.core.metrics import (
    auth_attempts_total,
    billing_transactions_total,
    request_duration_seconds
)
import time

# 認証試行カウント
@router.post("/api/auth/login")
async def login(credentials: LoginRequest):
    start_time = time.time()

    try:
        result = auth_service.login(credentials)
        auth_attempts_total.labels(status="success", method="password").inc()
        return result
    except AuthenticationError:
        auth_attempts_total.labels(status="failed", method="password").inc()
        raise
    finally:
        duration = time.time() - start_time
        request_duration_seconds.labels(
            endpoint="/api/auth/login",
            method="POST",
            status="200"
        ).observe(duration)

# トランザクションカウント
def add_credits(credits: int, purchase_record: dict):
    try:
        # 処理
        billing_transactions_total.labels(
            type="purchase",
            status="success"
        ).inc()
    except Exception:
        billing_transactions_total.labels(
            type="purchase",
            status="failed"
        ).inc()
        raise
```

#### /metrics エンドポイント

```bash
# メトリクス確認
curl http://localhost:8000/metrics

# 出力例:
# HELP auth_attempts_total Total authentication attempts
# TYPE auth_attempts_total counter
auth_attempts_total{status="success",method="password"} 150.0
auth_attempts_total{status="failed",method="password"} 12.0

# HELP request_duration_seconds Request duration in seconds
# TYPE request_duration_seconds histogram
request_duration_seconds_bucket{endpoint="/api/auth/login",le="0.1"} 120.0
request_duration_seconds_bucket{endpoint="/api/auth/login",le="0.5"} 145.0
request_duration_seconds_sum{endpoint="/api/auth/login"} 22.5
request_duration_seconds_count{endpoint="/api/auth/login"} 150.0
```

---

### 3.2 Prometheus Server設定（オプション）

**ファイル**: `server/prometheus.yml`（新規作成）

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'noteapp-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

**Docker Composeに追加**:

```yaml
services:
  # ... (既存のpostgres, redis)

  prometheus:
    image: prom/prometheus:latest
    container_name: noteapp-prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    container_name: noteapp-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prometheus_data:
  grafana_data:
```

---

## 🚨 4. アラート設定

### 4.1 GCP Cloud Monitoring アラート

#### アラートポリシー例

```yaml
# エラーレートアラート
displayName: "High Error Rate"
conditions:
  - displayName: "Error rate > 5%"
    conditionThreshold:
      filter: 'resource.type="cloud_run_revision" AND severity>=ERROR'
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
      comparison: COMPARISON_GT
      thresholdValue: 5
      duration: 300s

notificationChannels:
  - projects/PROJECT_ID/notificationChannels/EMAIL_CHANNEL

# レイテンシーアラート
displayName: "High Latency"
conditions:
  - displayName: "P95 latency > 1s"
    conditionThreshold:
      filter: 'metric.type="run.googleapis.com/request_latencies"'
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_DELTA
          crossSeriesReducer: REDUCE_PERCENTILE_95
      comparison: COMPARISON_GT
      thresholdValue: 1000
      duration: 300s
```

#### gcloud コマンドで作成

```bash
# 通知チャネル作成（Email）
gcloud alpha monitoring channels create \
  --display-name="Alert Email" \
  --type=email \
  --channel-labels=email_address=alerts@noteapp.com

# アラートポリシー作成（エラーレート）
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

---

### 4.2 Slack統合

#### Incoming Webhook設定

1. Slackワークスペースで Incoming Webhooks有効化
2. Webhook URL取得
3. 環境変数に設定

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

#### アラート送信実装

**ファイル**: `server/src/core/alerts.py`（新規作成）

```python
"""アラート送信"""
import requests
import os
import logging

logger = logging.getLogger(__name__)

def send_slack_alert(
    title: str,
    message: str,
    severity: str = "warning",
    fields: dict = None
):
    """Slackアラート送信"""
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        return

    color_map = {
        "info": "#36a64f",
        "warning": "#ff9900",
        "error": "#ff0000",
        "critical": "#8b0000"
    }

    payload = {
        "attachments": [{
            "color": color_map.get(severity, "#cccccc"),
            "title": title,
            "text": message,
            "fields": [
                {"title": k, "value": str(v), "short": True}
                for k, v in (fields or {}).items()
            ],
            "footer": "NoteApp Monitoring",
            "ts": int(time.time())
        }]
    }

    try:
        response = requests.post(webhook_url, json=payload, timeout=5)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to send Slack alert: {e}")

# 使用例
def handle_critical_error(error: Exception, context: dict):
    """クリティカルエラーハンドリング"""
    send_slack_alert(
        title="🚨 Critical Error Detected",
        message=str(error),
        severity="critical",
        fields={
            "Environment": os.getenv("ENVIRONMENT"),
            "User ID": context.get("user_id"),
            "Endpoint": context.get("endpoint"),
            "Error Type": type(error).__name__
        }
    )

    # Sentryにも送信
    sentry_sdk.capture_exception(error)
```

---

## 📈 5. ダッシュボード構築

### 5.1 Cloud Monitoring ダッシュボード

#### 主要メトリクス

1. **システム健全性**
   - エラーレート
   - レイテンシー (P50, P95, P99)
   - リクエスト数

2. **ビジネスメトリクス**
   - アクティブユーザー数
   - トランザクション数
   - トークン消費量

3. **インフラメトリクス**
   - CPU使用率
   - メモリ使用率
   - データベース接続数

---

### 5.2 Grafana ダッシュボード（オプション）

**ファイル**: `server/grafana/dashboard.json`（新規作成）

```json
{
  "dashboard": {
    "title": "NoteApp Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(http_requests_total[5m])"
        }]
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
        }]
      },
      {
        "title": "Latency (P95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))"
        }]
      }
    ]
  }
}
```

---

## ✅ 実装チェックリスト

### Phase 1: ログ集約（Day 1-2）

- [ ] GCP Cloud Logging統合（バックエンド）
- [ ] 構造化ログフォーマット統一
- [ ] ログレベル適切に設定
- [ ] 機密情報のサニタイズ確認

### Phase 2: エラー追跡（Day 2-3）

- [ ] Sentryプロジェクト作成
- [ ] バックエンド統合
- [ ] フロントエンド統合
- [ ] エラーフィルタリング設定
- [ ] ソースマップアップロード

### Phase 3: メトリクス収集（Day 3-4）

- [ ] Prometheusクライアント統合
- [ ] カスタムメトリクス実装
- [ ] /metricsエンドポイント公開
- [ ] Prometheus Server設定（オプション）

### Phase 4: アラート設定（Day 4-5）

- [ ] Cloud Monitoring アラート作成
- [ ] Slack Webhook設定
- [ ] アラートロジック実装
- [ ] 通知テスト

### Phase 5: ダッシュボード（Day 5-7）

- [ ] Cloud Monitoringダッシュボード作成
- [ ] 主要メトリクス可視化
- [ ] Grafana設定（オプション）
- [ ] チームへの共有

---

## 🎯 成功指標

### 監視品質

- ✅ エラー検知時間: < 5分
- ✅ ログ検索時間: < 10秒
- ✅ ダッシュボード更新: リアルタイム
- ✅ アラート精度: False Positive < 5%

### 運用効率

- ✅ インシデント対応時間: 50%削減
- ✅ デバッグ時間: 70%削減
- ✅ 障害予兆検知: 80%以上

---

**作成日**: 2025-11-21
**推定完了**: 5-7日（フルスタック実装）
