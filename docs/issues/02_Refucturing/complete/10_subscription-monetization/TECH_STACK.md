# 技術スタック & アーキテクチャ判断

サブスクリプション機能の実装に使用する技術スタックと、主要な設計判断をまとめたドキュメント。

---

## 技術スタック

### Phase 1: アプリ内課金

| 用途 | 技術 | 理由 |
|------|------|------|
| IAP統合 | `react-native-iap` | React Nativeで最も使われている、iOS/Android両対応 |
| 状態管理 | Zustand | 既存コードで使用中、軽量 |
| 永続化 | AsyncStorage | 既存コードで使用中 |

**インストール**:
```bash
npm install react-native-iap
cd ios && pod install
```

---

### Phase 2: ユーザー管理・同期

| 用途 | 技術 | 理由 |
|------|------|------|
| 認証 | Firebase Authentication | React Nativeとの統合が容易、OAuth対応 |
| データベース | Supabase (PostgreSQL) | リアルタイム同期、RLS、コスト効率 |
| ストレージ | Supabase Storage | データベースと統合、シンプル |
| バックエンド | FastAPI (既存) | 既存のLLM APIと統合 |

**代替案**:
- **Supabase の代わりに Firebase Firestore**: よりシンプルだが、コストが高い可能性
- **自前のPostgreSQL**: 完全なコントロールだが、管理コストが高い

**インストール**:
```bash
npm install @react-native-firebase/app @react-native-firebase/auth
npm install @supabase/supabase-js
```

---

### Phase 3: サーバー権限

| 用途 | 技術 | 理由 |
|------|------|------|
| 認証ミドルウェア | FastAPI Depends | 既存のFastAPIと統合 |
| トークン検証 | Firebase Admin SDK | Firebase tokenの検証 |
| レート制限 | slowapi | FastAPIで使いやすい |

**インストール** (Python):
```bash
pip install firebase-admin slowapi
```

---

## アーキテクチャの主要判断

### 1. ハイブリッドアプローチを選択

**判断**: Phase 1でローカル、Phase 2でクラウド、Phase 3でサーバー保護

**理由**:
- 早期リリース可能（3週間）
- 段階的にセキュリティ強化
- 既存ユーザーへの影響を最小化

**トレードオフ**:
- Phase 1では不正利用のリスクあり
- 3段階の実装で複雑性が増す

---

### 2. Firebase Authentication を採用

**判断**: Firebase Auth（Supabase Authではない）

**理由**:
- React Native / Expoとの統合が成熟
- OAuth（Google, Apple）のサポートが充実
- 無料枠が大きい（MAU 50,000）

**トレードオフ**:
- Supabaseと別サービスになる（統合の手間）
- Firebase依存が増える

**代替案**:
- **Supabase Auth**: データベースと統合されるが、React Nativeサポートが若干弱い
- **Auth0**: エンタープライズ向けだが、コストが高い

---

### 3. Supabase をデータベースに選択

**判断**: Supabase (PostgreSQL)

**理由**:
- リアルタイム同期が標準機能
- Row Level Security（RLS）でセキュリティ確保
- コスト効率が良い（$25/月で10GB）
- PostgreSQLの強力さ

**トレードオフ**:
- Firebase Firestoreより学習コストが高い
- リアルタイム性能はFirestoreに劣る場合がある

**代替案**:
- **Firebase Firestore**: よりシンプルだが、クエリ制限あり、コスト高
- **AWS RDS**: 完全なコントロールだが、管理コスト高

---

### 4. プラン定義を一元管理

**判断**: `app/constants/plans.ts` と `server/src/core/config.py` で定義

**理由**:
- フロント・バック両方で同じ値を参照
- 将来的な変更が容易
- 型安全性

**実装方針**:
- TypeScriptとPythonで同じ構造を維持
- 変更時は両方を更新（将来的にはJSONファイルで共有も検討）

---

### 5. 機能フラグシステム

**判断**: 機能ごとに文字列キー（`"llm.chat"`, `"search.rag"` など）

**理由**:
- 柔軟性が高い
- 新機能の追加が容易
- サーバー・クライアント間で共通

**実装**:
```typescript
// クライアント
if (hasFeatureAccess(tier, 'search.rag')) {
  // RAG検索を実行
}

// サーバー
@require_feature("search.rag")
async def rag_search(...):
  pass
```

---

### 6. 使用量トラッキング

**Phase 1判断**: ローカルでトラッキング
- AsyncStorageに保存
- 月次リセット（バックグラウンドタスク）

**Phase 2判断**: サーバーでトラッキング
- データベースの `usage_logs` テーブル
- 月次集計
- リアルタイム同期

**理由**:
- Phase 1では早期実装を優先
- Phase 2でサーバー側の正確なトラッキングに移行

---

### 7. IAP検証戦略

**Phase 1判断**: クライアント側のみ（基本的な検証）
- `react-native-iap` のレシート検証

**Phase 2判断**: サーバー側で再検証
- Apple/Google APIを使用
- データベースに購入記録を保存

**理由**:
- Phase 1では迅速な実装を優先
- Phase 2で不正防止を強化

---

## データモデル設計

### ユーザー (`users`)
```sql
id UUID
firebase_uid TEXT UNIQUE
email TEXT
display_name TEXT
created_at TIMESTAMP
```

### サブスクリプション (`subscriptions`)
```sql
id UUID
user_id UUID (FK)
tier TEXT (free/pro/enterprise)
status TEXT (active/canceled/expired/trial)
started_at TIMESTAMP
expires_at TIMESTAMP
stripe_subscription_id TEXT
```

### 使用量ログ (`usage_logs`)
```sql
id UUID
user_id UUID (FK)
month TEXT (YYYY-MM)
llm_requests INTEGER
file_count INTEGER
storage_used_mb FLOAT
```

### ファイル (`files`)
```sql
id UUID
user_id UUID (FK)
title TEXT
content TEXT
category TEXT
tags TEXT[]
size_mb FLOAT
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## セキュリティ設計

### Row Level Security (RLS)

Supabaseで各テーブルにRLSポリシーを設定:

```sql
-- ユーザーは自分のファイルのみアクセス可能
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own files"
  ON files FOR ALL
  USING (auth.uid() = user_id);
```

### APIレート制限

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/chat")
@limiter.limit("10/minute")  # Free: 10req/min
async def chat(...):
    pass
```

### 環境変数管理

```bash
# .env (本番環境)
FIREBASE_ADMIN_SDK_PATH=/path/to/firebase-admin-sdk.json
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
STRIPE_API_KEY=xxx
STRIPE_WEBHOOK_SECRET=xxx
```

**注意**: `.env` は `.gitignore` に追加

---

## デプロイ戦略

### Phase 1
- **フロントエンド**: App Store / Play Store
- **バックエンド**: 既存のサーバー（変更なし）

### Phase 2
- **フロントエンド**: App Store / Play Store（更新）
- **バックエンド**: FastAPI更新
- **データベース**: Supabase（新規）
- **認証**: Firebase Authentication（新規）

### Phase 3
- **フロントエンド**: 変更なし
- **バックエンド**: 権限チェック追加
- **モニタリング**: Sentry / CloudWatch追加

---

## モニタリング & ログ

### 重要な指標

| 指標 | ツール | 目的 |
|------|--------|------|
| IAP購入率 | App Store / Play Console | 収益分析 |
| LLM使用量 | カスタムログ | コスト管理 |
| API エラー率 | Sentry | 安定性監視 |
| レスポンスタイム | CloudWatch | パフォーマンス |
| アクティブユーザー | Firebase Analytics | エンゲージメント |

### アラート設定

```python
# サーバー側でアラート
if monthly_llm_requests > 10000:
    send_alert("LLM usage exceeds threshold")

if error_rate > 0.05:  # 5%
    send_alert("High error rate detected")
```

---

## コスト最適化

### LLM APIコスト削減
- プランごとの厳格な制限
- キャッシング（同じクエリの再利用）
- モデル選択の最適化（Flashを優先）

### インフラコスト削減
- Supabaseの無料枠活用（初期）
- Firebase Authの無料枠活用
- GCPのSecret Manager継続利用

---

## 今後の拡張性

### 将来的に追加できる機能

1. **Stripe統合** (Phase 2以降)
   - Webからのサブスクリプション購入
   - より柔軟な価格設定

2. **チーム機能** (Phase 3以降)
   - 複数ユーザーでのファイル共有
   - Enterpriseプランでの提供

3. **カスタムLLMプロバイダー** (Enterprise)
   - ユーザー自身のAPIキー使用
   - プライベートLLMモデル

4. **使用量分析ダッシュボード** (管理者向け)
   - リアルタイム使用状況
   - コスト分析
   - ユーザー行動分析

---

**最終更新**: 2025-11-06
