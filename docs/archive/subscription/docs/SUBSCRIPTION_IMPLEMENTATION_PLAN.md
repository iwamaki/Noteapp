# サブスクリプション課金機能 実装計画書

## 概要

このドキュメントは、Noteappに課金機能を実装するための段階的な計画書です。
**ハイブリッドアプローチ**を採用し、Phase 1で早期リリース、Phase 2-3で本格的な機能拡張を行います。

## 実装方針

- **アプローチ**: ハイブリッド（段階的実装）
- **Phase 1**: アプリ内課金（IAP）のみ - 3週間
- **Phase 2**: ユーザー管理・認証の追加 - 4週間
- **Phase 3**: サーバー側の権限強制 - 2週間

## プラン定義

### 無料プラン (Free)

- **価格**: ¥0/月
- **制限**:
  - ファイル数: 50
  - LLMリクエスト: 100回/月
  - ストレージ: 100MB
  - 1ファイルサイズ: 10MB
- **機能**:
  - 基本的なチャット機能
  - 基本的なファイル編集
  - 全文検索
  - 手動バックアップ

### Proプラン

- **価格**: ¥980/月
- **制限**:
  - ファイル数: 1,000
  - LLMリクエスト: 1,000回/月
  - ストレージ: 5GB
  - 1ファイルサイズ: 50MB
- **機能**:
  - **高度なLLMモデル** (Gemini Pro等)
  - **RAG検索** (ナレッジベース)
  - **Web検索**
  - クラウド同期
  - バッチ操作
  - バージョン履歴
  - カスタムシステムプロンプト
  - セマンティック検索
  - 広告なし

### Enterpriseプラン

- **価格**: ¥3,000/月
- **制限**: すべて無制限
- **機能**: すべての機能 + 優先サポート

---

## Phase 1: アプリ内課金 (IAP) 実装 [3週間]

### 目標

- 早期リリース・収益化開始
- ローカルでのライセンス管理
- クライアント側での機能制限

### Week 1: IAP統合 & UI実装

#### 1.1 React Native IAP統合

```bash
npm install react-native-iap
cd ios && pod install
```

**実装内容**:
- App Store Connect / Google Play Consoleでプロダクト登録
- IAPライブラリの初期化
- プロダクトリスト取得
- 購入フロー実装
- レシート検証（基本）

**ファイル**: `app/services/iapService.ts`

#### 1.2 サブスクリプション画面の作成

**新規ファイル**:
- `app/screen/subscription/SubscriptionScreen.tsx`
- `app/screen/subscription/PlanCard.tsx`
- `app/screen/subscription/FeatureList.tsx`

**実装内容**:
- プラン比較表示
- 価格表示
- 購入ボタン
- 復元ボタン（過去の購入を復元）

#### 1.3 使用量表示ダッシュボード

**新規ファイル**: `app/screen/usage/UsageScreen.tsx`

**実装内容**:
- LLMリクエスト数表示
- ファイル数表示
- ストレージ使用量表示
- プログレスバー
- アップグレード促進UI

### Week 2: 機能制限ロジック実装

#### 2.1 フロントエンド権限チェック

**新規ファイル**: `app/utils/subscriptionHelpers.ts`

```typescript
import { useSettingsStore } from '@/settings/settingsStore';
import { hasFeatureAccess, hasModelAccess, isWithinLimit } from '@/constants';

export function useSubscription() {
  const { subscription, usage } = useSettingsStore();

  return {
    canUseFeature: (feature: FeatureKey) => hasFeatureAccess(subscription.tier, feature),
    canUseModel: (model: string) => hasModelAccess(subscription.tier, model),
    canSendLLMRequest: () => isWithinLimit(subscription.tier, 'maxLLMRequests', usage.monthlyLLMRequests),
    canCreateFile: () => isWithinLimit(subscription.tier, 'maxFiles', usage.currentFileCount),
    // ...その他のヘルパー
  };
}
```

#### 2.2 LLM機能の制限実装

**更新ファイル**:
- `app/features/chat/hooks/useChat.ts`: モデル選択制限
- `app/features/chat/components/ModelSelector.tsx`: Pro専用モデルにバッジ表示
- `app/features/chat/handlers/sendMessage.ts`: リクエスト前の制限チェック

**実装内容**:
```typescript
// メッセージ送信前のチェック
if (!canSendLLMRequest()) {
  showUpgradeModal('LLMリクエスト数の上限に達しました');
  return;
}

if (selectedModel.includes('pro') && !canUseModel(selectedModel)) {
  showUpgradeModal('このモデルはProプランが必要です');
  return;
}
```

#### 2.3 RAG・Web検索の制限

**更新ファイル**:
- チャット設定画面: RAG/Web検索トグルを条件付き表示
- LLMリクエスト: RAG/Web検索使用時にプランチェック

**実装内容**:
```typescript
// 設定画面
{canUseFeature('search.rag') && (
  <Switch
    label="RAG検索を有効化"
    value={ragEnabled}
    onChange={setRagEnabled}
  />
)}

{!canUseFeature('search.rag') && (
  <UpgradePrompt feature="RAG検索" requiredPlan="Pro" />
)}
```

#### 2.4 ファイル制限

**更新ファイル**:
- `app/screen/file-edit/FileEditScreen.tsx`: 新規作成前のチェック
- `app/data/repositories/fileRepository.ts`: 作成・保存前の容量チェック

### Week 3: アップグレードフロー & テスト

#### 3.1 アップグレード促進UI

**新規コンポーネント**:
- `app/components/UpgradeModal.tsx`: モーダルダイアログ
- `app/components/UpgradePrompt.tsx`: インラインプロンプト
- `app/components/ProBadge.tsx`: Pro機能バッジ

#### 3.2 使用量トラッキング

**更新ファイル**: `app/settings/settingsStore.ts`

**実装内容**:
```typescript
// LLMリクエスト後に呼び出し
incrementLLMUsage: () => {
  const { usage } = get().settings;
  updateSettings({
    usage: {
      ...usage,
      monthlyLLMRequests: usage.monthlyLLMRequests + 1
    }
  });
}

// ファイル作成時に呼び出し
incrementFileCount: () => { /* ... */ }

// 毎月1日にリセット（バックグラウンドタスクで実装）
resetMonthlyUsage: () => { /* ... */ }
```

#### 3.3 テスト & デバッグ

- 各プランでの機能制限テスト
- 購入フロー全体のテスト
- レシート検証テスト
- エラーハンドリング確認
- UI/UXの最終調整

### Phase 1 成果物

- ✅ IAP統合完了
- ✅ ローカルでのライセンス管理
- ✅ フロントエンドでの機能制限
- ✅ サブスクリプション画面
- ✅ 使用量ダッシュボード
- ✅ アップグレードフロー

### Phase 1 の制約

- サーバー側での制限なし（不正利用のリスク）
- 複数デバイス同期なし
- 使用量はローカルでのみ追跡
- LLM APIキーがフロントエンドに露出（現状のまま）

---

## Phase 2: ユーザー管理・認証 [4週間]

### 目標

- ユーザーアカウント機能
- 複数デバイス同期
- クラウドバックアップ
- サーバー側でのサブスクリプション状態管理

### Week 4: インフラ & 認証基盤

#### 4.1 技術選定

**推奨スタック**:
- **認証**: Firebase Authentication
- **データベース**: Supabase (PostgreSQL)
- **ストレージ**: Supabase Storage または Firebase Storage

#### 4.2 Firebase Authentication統合

```bash
npm install @react-native-firebase/app @react-native-firebase/auth
```

**実装内容**:
- Firebase プロジェクト作成
- iOS/Android設定
- メール認証
- Google/Apple OAuth
- 認証状態の永続化

**新規ファイル**:
- `app/services/authService.ts`
- `app/contexts/AuthContext.tsx`

#### 4.3 データベース設計

**Supabaseテーブル定義**:

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- サブスクリプションテーブル
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  started_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT true,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 使用量トラッキングテーブル
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- 'YYYY-MM' 形式
  llm_requests INTEGER DEFAULT 0,
  file_count INTEGER DEFAULT 0,
  storage_used_mb FLOAT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- ファイルテーブル（既存のローカルストレージから移行）
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  tags TEXT[],
  summary TEXT,
  size_mb FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Row Level Security (RLS) の設定
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own files"
  ON files FOR ALL
  USING (auth.uid() = user_id);

-- 同様のポリシーを他のテーブルにも適用
```

### Week 5: ユーザー管理機能実装

#### 5.1 認証画面

**新規ファイル**:
- `app/screen/auth/LoginScreen.tsx`
- `app/screen/auth/SignupScreen.tsx`
- `app/screen/auth/ProfileScreen.tsx`

#### 5.2 ローカルデータの移行

**新規ファイル**: `app/services/migrationService.ts`

**実装内容**:
- ローカルのファイルをSupabaseにアップロード
- 既存の設定をクラウドに同期
- 移行進捗の表示

#### 5.3 Supabaseクライアント統合

```bash
npm install @supabase/supabase-js
```

**新規ファイル**:
- `app/services/supabaseClient.ts`
- `app/repositories/cloudFileRepository.ts`

### Week 6: サブスクリプション同期

#### 6.1 サーバー側のサブスクリプション管理API

**新規ファイル** (Python/FastAPI):
- `server/src/auth/middleware.py`: 認証ミドルウェア
- `server/src/subscription/models.py`: Pydanticモデル
- `server/src/subscription/service.py`: ビジネスロジック
- `server/src/subscription/router.py`: APIエンドポイント

**主要エンドポイント**:
```python
GET  /api/subscription/status  # サブスクリプション状態取得
POST /api/subscription/sync    # IAP購入情報の同期
GET  /api/usage/current         # 現在の使用量取得
POST /api/usage/increment       # 使用量のインクリメント
```

#### 6.2 IAP購入とサーバーの同期

**実装内容**:
1. アプリ内購入完了
2. レシートをサーバーに送信
3. サーバー側でApple/Google APIを使用して検証
4. データベースのサブスクリプション状態を更新
5. フロントエンドに新しい状態を返す

### Week 7: クラウド同期機能

#### 7.1 ファイル同期

**更新ファイル**:
- `app/data/repositories/fileRepository.ts`: Cloud Repository統合
- `app/services/syncService.ts`: 自動同期ロジック

**実装内容**:
- オフライン編集のキューイング
- オンライン復帰時の自動同期
- コンフリクト解決

#### 7.2 設定同期

- AsyncStorageとSupabaseの二重管理
- ログイン時にクラウドから設定を取得
- 変更時にクラウドに保存

#### 7.3 テスト

- 複数デバイスでのテスト
- オフライン→オンライン遷移テスト
- 同期コンフリクトのテスト

### Phase 2 成果物

- ✅ ユーザー認証機能
- ✅ クラウドデータベース統合
- ✅ 複数デバイス同期
- ✅ サーバー側でのサブスクリプション管理
- ✅ 使用量のサーバー追跡

---

## Phase 3: サーバー側権限強制 [2週間]

### 目標

- サーバー側での機能制限
- セキュアなLLM APIキー管理
- 不正利用の防止

### Week 8: API権限チェック実装

#### 8.1 認証ミドルウェアの拡張

**更新ファイル**: `server/src/auth/middleware.py`

```python
from functools import wraps
from fastapi import HTTPException, Request

def require_feature(feature: str):
    """機能アクセス権限をチェックするデコレーター"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            user = await get_current_user(request)
            subscription = await get_user_subscription(user.id)

            if not settings.has_feature_access(subscription.tier, feature):
                raise HTTPException(
                    status_code=403,
                    detail=f"Feature '{feature}' requires upgrade to Pro or higher"
                )

            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

def check_usage_limit(limit_type: str):
    """使用量制限をチェックするデコレーター"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            user = await get_current_user(request)
            usage = await get_current_usage(user.id)
            subscription = await get_user_subscription(user.id)
            limits = settings.get_plan_limits(subscription.tier)

            if limit_type == "llm_request":
                max_requests = limits["max_llm_requests"]
                if max_requests != -1 and usage.llm_requests >= max_requests:
                    raise HTTPException(
                        status_code=429,
                        detail="Monthly LLM request limit exceeded"
                    )

            # 使用量をインクリメント
            await increment_usage(user.id, limit_type)

            return await func(request, *args, **kwargs)
        return wrapper
    return decorator
```

#### 8.2 LLMルーターの保護

**更新ファイル**: `server/src/llm/routers/chat_router.py`

```python
@router.post("/api/chat")
@require_feature("llm.chat")
@check_usage_limit("llm_request")
async def chat(
    request: ChatRequest,
    user: User = Depends(get_current_user)
):
    # モデルの権限チェック
    subscription = await get_user_subscription(user.id)
    if settings.is_advanced_model(request.model):
        if subscription.tier == "free":
            raise HTTPException(
                status_code=403,
                detail="Advanced models require Pro subscription"
            )

    # チャット処理
    response = await chat_service.chat(request)
    return response
```

#### 8.3 RAG・Web検索の保護

**更新ファイル**:
- `server/src/llm/routers/knowledge_base_router.py`
- `server/src/llm/tools/web_search.py`

```python
@router.post("/api/rag/search")
@require_feature("search.rag")
async def rag_search(...):
    # ...

@router.post("/api/web/search")
@require_feature("search.web")
async def web_search(...):
    # ...
```

### Week 9: セキュリティ強化 & テスト

#### 9.1 LLM APIキーの管理

**現状の問題**:
- Gemini APIキーが全ユーザーで共有
- バックエンドで管理されているが、制限が弱い

**改善策**:
1. プランごとにAPIキーを分離（オプション）
2. レート制限の厳格化
3. 使用量の監視・アラート

#### 9.2 セキュリティ監査

- SQLインジェクション対策確認
- XSS対策確認
- CSRF対策確認
- レート制限の実装
- ログ監視の実装

#### 9.3 包括的テスト

- 各プランでの全機能テスト
- エッジケースのテスト
- 負荷テスト
- セキュリティペネトレーションテスト

#### 9.4 ドキュメント作成

- API仕様書
- 管理者マニュアル
- トラブルシューティングガイド

### Phase 3 成果物

- ✅ サーバー側での完全な権限制御
- ✅ セキュアなAPI設計
- ✅ 不正利用の防止
- ✅ 包括的なテスト完了
- ✅ 本番環境への準備完了

---

## リリース計画

### Phase 1リリース (Week 3終了時)

**対象**: 新規ユーザー + 既存ユーザー

**機能**:
- アプリ内課金
- ローカルでの機能制限
- Proプラン: RAG、Web検索、高度なLLMモデル

**マーケティング**:
- 「早期アクセス特典」として初月50%オフ
- 既存ユーザーに30日トライアル提供

### Phase 2リリース (Week 7終了時)

**対象**: 全ユーザー

**追加機能**:
- ユーザーアカウント
- 複数デバイス同期
- クラウドバックアップ

**マイグレーション**:
- 既存のローカルデータを自動移行
- IAP購入履歴を保持

### Phase 3リリース (Week 9終了時)

**対象**: 全ユーザー

**改善**:
- セキュリティ強化
- パフォーマンス改善
- 安定性向上

---

## コスト試算

### 開発コスト

- Phase 1: 3週間 x 40時間 = 120時間
- Phase 2: 4週間 x 40時間 = 160時間
- Phase 3: 2週間 x 40時間 = 80時間
- **合計**: 360時間

### インフラコスト（月額）

- **Firebase**:
  - Authentication: 無料枠内（MAU 50,000まで）
  - Storage: ~$0.10/GB
- **Supabase**:
  - Pro: $25/月（10GBストレージ、250,000 MAU）
  - または従量課金
- **GCP (Gemini API)**:
  - 現状維持（既存のSecret Manager使用）

**想定初期ユーザー**: 1,000人
**想定Pro契約率**: 10% = 100人
**月次収益**: 100 x ¥980 = ¥98,000

**インフラコスト**: 約$30-50/月 (¥4,500-7,500)
**純利益**: 約¥90,000/月

---

## リスク管理

### リスク1: IAP承認の遅延

**対策**:
- 早めにApp Store Connect / Play Consoleでプロダクト登録
- 承認プロセス中に他の開発を進める

### リスク2: データ移行の失敗

**対策**:
- 移行前にローカルバックアップを作成
- 段階的な移行（最初は並行稼働）
- ロールバック計画の準備

### リスク3: 不正利用（Phase 1）

**対策**:
- 明らかに異常な使用パターンの監視
- Phase 2への早期移行
- 利用規約での対応

### リスク4: サーバーコスト超過

**対策**:
- LLM APIの使用量監視
- プランごとの厳格な制限
- アラート設定

---

## 次のステップ

### 今すぐやること

1. ✅ **定数ファイルの作成** - 完了
2. ✅ **settingsStoreの更新** - 完了
3. ✅ **バックエンド設定の更新** - 完了

### これから始めること

4. **App Store Connect / Play Consoleの設定**
   - プロダクトID登録
   - 価格設定
   - スクリーンショット準備

5. **react-native-iapのインストール**
   ```bash
   npm install react-native-iap
   cd ios && pod install
   ```

6. **サブスクリプション画面のUIデザイン**
   - Figmaでワイヤーフレーム作成
   - デザインレビュー

7. **Week 1のタスク開始**

---

## まとめ

本計画書では、**3段階の段階的実装**により、早期リリースと将来の拡張性を両立させます。

- **Phase 1 (3週)**: 早期収益化、基本的な機能制限
- **Phase 2 (4週)**: ユーザー管理、複数デバイス対応
- **Phase 3 (2週)**: セキュリティ強化、本番環境対応

**総開発期間**: 9週間
**初期リリース**: 3週間後

定数・設定ファイルは既に整備されており、すぐにPhase 1の実装を開始できる状態です。

---

## 📊 実装進捗状況

### Phase 1: アプリ内課金（IAP）のみ - 進行中

#### ✅ 完了したタスク

##### Week 1: 基盤実装 (2025-11-06)

**1. IAP Service層の実装** ✅
- ファイル: `app/data/services/iapService.ts`
- 実装内容:
  - react-native-iap v14 の統合
  - IAP接続の初期化・終了処理
  - サブスクリプション商品の取得（fetchProducts）
  - 購入フロー（purchaseSubscription）
  - 購入履歴の復元（restorePurchases）
  - レシート検証（Phase 1: 簡易版）
  - プロダクトID定義（PRO_MONTHLY, PRO_YEARLY, ENTERPRISE_MONTHLY）
- コミット: `e254378`

**2. Subscription Helper関数の実装** ✅
- ファイル: `app/utils/subscriptionHelpers.ts`
- 実装内容:
  - `useSubscription()`: サブスクリプション情報取得フック
  - `useFeatureAccess()`: 機能アクセス権限チェック
  - `useModelAccess()`: LLMモデルアクセス権限チェック
  - `useUsageLimit()`: 使用量制限チェック
  - `canSendLLMRequest()`, `canCreateFile()`: 操作可否判定
  - `isFileSizeAllowed()`, `isStorageAvailable()`: 容量チェック
  - 使用量警告レベル判定（safe/warning/danger）
  - 期限計算・表示関数
- コミット: `e254378`

**3. Subscription UI画面の実装** ✅
- ファイル: `app/screen/subscription/SubscriptionScreen.tsx`
- 実装内容:
  - プラン選択画面（Free/Pro/Enterprise）
  - 現在のプラン表示
  - 購入フロー統合
  - 購入の復元機能
  - ダウングレード確認ダイアログ
  - エラーハンドリング（ユーザーキャンセル対応）
- コミット: `e254378`

**4. Plan Card コンポーネント** ✅
- ファイル: `app/screen/subscription/components/PlanCard.tsx`
- 実装内容:
  - プラン情報カード表示
  - 主要機能リスト（ファイル数、LLMリクエスト、ストレージ）
  - プロ機能リスト（高度なモデル、RAG検索、Web検索）
  - おすすめバッジ
  - 購入ボタン（ローディング状態対応）
  - 現在のプランハイライト
- コミット: `e254378`

**5. Navigation統合** ✅
- ファイル: `app/navigation/RootNavigator.tsx`, `app/navigation/types.ts`
- 実装内容:
  - Subscriptionスクリーンの追加
  - TypeScript型定義
- コミット: `e254378`

**6. Settings画面との統合** ✅
- ファイル: `app/settings/SettingsScreen.tsx`
- 実装内容:
  - サブスクリプションセクション追加
  - 現在のプラン表示
  - Subscription画面への導線
  - プラン管理/アップグレードボタン
- コミット: `e254378`

**7. 依存関係のインストール** ✅
- `react-native-iap` v14.4.38 - IAP機能
- `expo-dev-client` - 開発ビルド対応
- コミット: `e254378`

**8. 開発環境のセットアップ** ✅
- EAS CLI インストール
- EAS Build による開発ビルド作成
- Android実機でのUI動作確認完了
- 日付: 2025-11-06

**9. コード品質** ✅
- TypeScript型チェック: ✅ エラーなし
- ESLint: ✅ 新規コードにエラー・警告なし
- react-native-iap v14 API対応完了

#### 🚧 進行中のタスク

**既存機能のUI不整合修正**
- 状況: Android開発ビルドで既存機能のUI不整合を発見
- 優先度: 高（次のタスク）
- 対応方針: エラー詳細を調査後、修正作業を実施

#### 📝 次のタスク（Week 1-2）

1. **既存機能のバグ修正**
   - [ ] UI不整合の原因特定
   - [ ] 修正実装
   - [ ] 動作確認

2. **App Store Connect / Play Console 設定**
   - [ ] アプリ登録
   - [ ] アプリ内商品（サブスクリプション）作成
     - [ ] noteapp.pro.monthly (¥980/月)
     - [ ] noteapp.pro.yearly (年間プラン)
     - [ ] noteapp.enterprise.monthly (¥3,000/月)
   - [ ] テストアカウント設定

3. **購入フローのテスト**
   - [ ] Sandbox環境でのテスト
   - [ ] 購入成功フロー確認
   - [ ] 復元機能確認
   - [ ] エラーハンドリング確認

4. **使用量トラッキング実装**
   - [ ] LLMリクエストカウント
   - [ ] ファイル数カウント
   - [ ] ストレージ使用量計算
   - [ ] 月次リセット機能

5. **機能制限の適用**
   - [ ] LLM機能でのプランチェック
   - [ ] ファイル作成時の制限チェック
   - [ ] アップグレードプロンプト表示

#### 📅 今後のマイルストーン

- **Week 2完了目標**: Sandbox環境での購入フロー完全動作
- **Week 3完了目標**: Phase 1リリース準備完了
- **Phase 2開始予定**: Phase 1リリース後

---

### 📌 既知の課題

1. **レシート検証**
   - 現状: Phase 1では簡易実装（transactionIdのみ確認）
   - 今後: Phase 2でサーバーサイド検証を実装

2. **サブスクリプション有効期限**
   - 現状: 固定30日で仮実装
   - 今後: 実際のレシート情報から取得

3. **Expo Go 非対応**
   - 現状: react-native-iapを使用するため、Expo Goでは動作不可
   - 対応: EAS Build開発ビルドを使用（完了）

---

### 🔄 最終更新

**日付**: 2025-11-06
**更新者**: iwash
**最新コミット**: `e254378` - feat: Add subscription/IAP functionality with UI screens
