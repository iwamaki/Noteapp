---
filename: 20251115_security_critical_02_billing_price_manipulation
status: new
priority: high
attempt_count: 0
tags: [security, critical, billing, payment, fraud]
date: 2025/11/15
---

## 概要 (Overview)

課金システムにおいて、トークンパッケージの価格がフロントエンド (クライアント側) で定義されており、バックエンドがクライアントから送信された`credits`値をそのまま信頼しています。これにより、攻撃者はローカルでコードを改ざんし、**任意の価格でクレジットを購入できる**致命的な脆弱性が存在します。

**脆弱性分類:**
- **CWE-20:** Improper Input Validation
- **CWE-639:** Authorization Bypass Through User-Controlled Key
- **CVSS Score:** 9.1 (Critical)
- **影響:** 金銭的損失、ビジネスモデル崩壊

## 背景 (Background)

### 現在の課金フロー

1. **フロントエンド:** `TOKEN_PACKAGES`配列で価格とクレジット数を定義
2. **ユーザー:** アプリストアで課金を実行
3. **フロントエンド:** 購入完了後、サーバーに`credits`と`purchase_record`を送信
4. **バックエンド:** クライアントから送信された`credits`をそのままDBに追加

### 脆弱なコード

**フロントエンド:**
```typescript
// app/billing/constants/tokenPackages.ts:42-73
export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'token_300',
    description: '初心者向け',
    price: 300,  // ← クライアント側で定義（改ざん可能）
    credits: 300,  // ← クライアント側で定義（改ざん可能）
    productId: Platform.select({
      ios: 'com.yourapp.token_300',
      android: 'token_300',
    }),
  },
  {
    id: 'token_500',
    description: '中級ユーザー向け',
    price: 500,
    credits: 500,
    productId: Platform.select({
      ios: 'com.yourapp.token_500',
      android: 'token_500',
    }),
  },
  {
    id: 'token_1000',
    description: 'ヘビーユーザー向け',
    price: 1000,
    credits: 1000,
    productId: Platform.select({
      ios: 'com.yourapp.token_1000',
      android: 'token_1000',
    }),
  },
];
```

**バックエンド:**
```python
# server/src/billing/router.py
@router.post("/billing/add-credits")
async def add_credits(
    request: AddCreditsRequest,  # credits がクライアントから送信される
    user_id: str = Depends(verify_user),
    db: Session = Depends(get_db)
):
    service = BillingService(user_id=user_id, db=db)

    # クライアントから送信されたcreditsをそのまま使用（危険！）
    result = service.add_credits(
        credits=request.credits,  # ← クライアントが送信した値を信頼
        purchase_record=request.purchase_record
    )
    return result

# server/src/billing/service.py
class BillingService:
    def add_credits(self, credits: int, purchase_record: dict) -> Dict:
        # クレジット残高を更新
        balance = self.db.query(CreditBalance).filter_by(user_id=self.user_id).first()
        if not balance:
            balance = CreditBalance(user_id=self.user_id, total_credits=0)
            self.db.add(balance)

        # クライアントから送信されたcreditsをそのまま加算
        balance.total_credits += credits  # ← ここが問題！
        self.db.commit()

        return {"success": True, "total_credits": balance.total_credits}
```

### なぜこれが問題なのか？

1. **価格決定権がクライアント側:**
   - 本来、価格はサーバー側で管理すべき
   - クライアント側のコードは攻撃者が自由に書き換え可能

2. **IAP検証が不十分:**
   - 購入レシートの検証はしているが、購入した**商品ID**と**クレジット数**の対応をチェックしていない
   - 「100円の商品を購入したレシート」で「10万クレジット」を要求できる

3. **ビジネスロジックの信頼境界違反:**
   - クライアント = 信頼できない領域
   - サーバー = 信頼できる領域
   - 価格決定は信頼できる領域で行うべき

## 攻撃シナリオ (Attack Scenarios)

### シナリオ1: React Nativeアプリの改ざん

1. **攻撃者がアプリをデバッグモードで実行:**
```bash
expo start --dev-client
```

2. **Chrome DevToolsでコードを改ざん:**
```typescript
// 開発者ツールのコンソールで実行
const TOKEN_PACKAGES = [
  {
    id: 'token_1000',
    description: 'ハック',
    price: 1,  // 1円に変更
    credits: 1000000,  // 100万クレジットに変更
    productId: 'token_300',  // 実際には300円の商品を購入
  },
];
```

3. **アプリストアで300円の商品を購入**

4. **サーバーに改ざんされたリクエストを送信:**
```json
POST /billing/add-credits
{
  "credits": 1000000,  // ← 100万クレジット要求
  "purchase_record": {
    "productId": "token_300",  // 実際の購入は300円
    "transactionId": "GPA.1234...",
    "purchaseToken": "abc..."
  }
}
```

5. **サーバーがそのまま受け入れ:**
   - 300円の支払いで100万クレジットを取得

### シナリオ2: APIリクエストの直接改ざん

1. **正規の課金を実行** (300円)

2. **Burp SuiteやCharles Proxyで通信を傍受:**
```
POST /billing/add-credits HTTP/1.1
Content-Type: application/json

{
  "credits": 300,  ← ここを改ざん
  "purchase_record": { ... }
}
```

3. **リクエストを書き換え:**
```
{
  "credits": 999999,  ← 改ざん
  "purchase_record": { ... }
}
```

4. **改ざんしたリクエストを送信** → 300円で999,999クレジット取得

### シナリオ3: リプレイ攻撃

1. **正規の1000円課金を実行**

2. **`purchase_record`を保存**

3. **同じ`purchase_record`で複数回`/billing/add-credits`を呼び出し**

4. **1回の購入で無限にクレジットを取得**

※ 現在の実装では、重複購入のチェックが不十分な可能性があります

## 実装方針 (Implementation Strategy)

### 原則: "Trust the Server, Not the Client"

**クライアントから送信される情報:**
- `product_id` (商品ID)
- `purchase_token` (購入トークン/レシート)

**サーバーが決定する情報:**
- `credits` (付与するクレジット数)
- `price` (価格)

### フェーズ1: サーバー側商品カタログの実装

**目標:** 商品IDとクレジット数の対応をサーバー側で管理

#### 1.1 商品マスタの定義

```python
# server/src/billing/constants.py
from typing import Dict, TypedDict

class ProductInfo(TypedDict):
    credits: int
    price_jpy: int
    name: str
    description: str

# 商品カタログ (サーバー側で管理)
PRODUCT_CATALOG: Dict[str, ProductInfo] = {
    "token_300": {
        "credits": 300,
        "price_jpy": 300,
        "name": "初心者向けパック",
        "description": "初めての方におすすめ",
    },
    "token_500": {
        "credits": 500,
        "price_jpy": 500,
        "name": "中級ユーザー向けパック",
        "description": "よく使う方向け",
    },
    "token_1000": {
        "credits": 1000,
        "price_jpy": 1000,
        "name": "ヘビーユーザー向けパック",
        "description": "たっぷり使いたい方向け",
    },
}

def get_product_info(product_id: str) -> ProductInfo:
    """商品情報を取得"""
    product = PRODUCT_CATALOG.get(product_id)
    if not product:
        raise ValueError(f"Invalid product ID: {product_id}")
    return product
```

#### 1.2 サーバー側検証の実装

```python
# server/src/billing/service.py
from .constants import get_product_info

class BillingService:
    def add_credits_from_purchase(
        self,
        product_id: str,  # クライアントから送信
        purchase_token: str,  # IAP購入トークン
    ) -> Dict:
        # ステップ1: IAP検証
        verification_result = self.verify_purchase(product_id, purchase_token)
        if not verification_result["valid"]:
            raise ValueError("Invalid purchase")

        # ステップ2: 重複購入チェック
        existing_purchase = self.db.query(PurchaseHistory).filter_by(
            purchase_token=purchase_token
        ).first()
        if existing_purchase:
            logger.warning(f"Duplicate purchase attempt: {purchase_token}")
            raise ValueError("This purchase has already been processed")

        # ステップ3: 商品情報を**サーバー側カタログ**から取得
        try:
            product_info = get_product_info(product_id)
        except ValueError as e:
            logger.error(f"Invalid product_id from client: {product_id}")
            raise ValueError("Invalid product")

        # ステップ4: クレジット付与（サーバーが決定した値）
        credits_to_add = product_info["credits"]  # ← サーバーが決定

        balance = self.db.query(CreditBalance).filter_by(user_id=self.user_id).first()
        if not balance:
            balance = CreditBalance(user_id=self.user_id, total_credits=0)
            self.db.add(balance)

        balance.total_credits += credits_to_add

        # ステップ5: 購入履歴の記録（重複防止）
        purchase_history = PurchaseHistory(
            user_id=self.user_id,
            product_id=product_id,
            purchase_token=purchase_token,
            credits_added=credits_to_add,
            price_jpy=product_info["price_jpy"],
            purchased_at=datetime.now(),
        )
        self.db.add(purchase_history)
        self.db.commit()

        logger.info(
            f"Credits added successfully",
            extra={
                "user_id": self.user_id,
                "product_id": product_id,
                "credits": credits_to_add,
            }
        )

        return {
            "success": True,
            "credits_added": credits_to_add,
            "total_credits": balance.total_credits,
        }
```

#### 1.3 購入履歴テーブルの追加

```python
# server/src/billing/models.py
from sqlalchemy import Column, String, Integer, DateTime, UniqueConstraint

class PurchaseHistory(Base):
    __tablename__ = "purchase_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    product_id = Column(String, nullable=False)
    purchase_token = Column(String, nullable=False, unique=True)  # 重複防止
    credits_added = Column(Integer, nullable=False)
    price_jpy = Column(Integer, nullable=False)
    purchased_at = Column(DateTime, nullable=False)
    acknowledged = Column(Boolean, default=False)  # Google Play確認済みか

    __table_args__ = (
        UniqueConstraint('purchase_token', name='uq_purchase_token'),
    )
```

**マイグレーション:**
```bash
cd server
alembic revision --autogenerate -m "Add purchase_history table for duplicate prevention"
alembic upgrade head
```

#### 1.4 APIエンドポイントの修正

```python
# server/src/billing/router.py
from .schemas import AddCreditsRequest

class AddCreditsRequest(BaseModel):
    product_id: str  # ← credits削除
    purchase_token: str

@router.post("/billing/add-credits")
async def add_credits(
    request: AddCreditsRequest,
    user_id: str = Depends(verify_user),
    db: Session = Depends(get_db)
):
    service = BillingService(user_id=user_id, db=db)

    try:
        result = service.add_credits_from_purchase(
            product_id=request.product_id,  # ← product_idのみ送信
            purchase_token=request.purchase_token,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### フェーズ2: IAP検証の強化

**目標:** Google Play/App Storeの購入情報を直接取得し、クライアントの情報と照合

#### 2.1 Google Play Billing検証の強化

```python
# server/src/billing/iap_verification.py
from google.oauth2 import service_account
from googleapiclient.discovery import build

class IAPVerifier:
    def verify_android_purchase(
        self,
        package_name: str,
        product_id: str,
        purchase_token: str
    ) -> Dict:
        """Google Playの購入情報を直接取得して検証"""

        # Google Play Developer APIクライアント
        credentials = service_account.Credentials.from_service_account_file(
            settings.GOOGLE_APPLICATION_CREDENTIALS,
            scopes=['https://www.googleapis.com/auth/androidpublisher']
        )
        service = build('androidpublisher', 'v3', credentials=credentials)

        # 購入情報を取得
        try:
            purchase = service.purchases().products().get(
                packageName=package_name,
                productId=product_id,
                token=purchase_token
            ).execute()

            # 購入状態を確認
            purchase_state = purchase.get('purchaseState')
            if purchase_state != 0:  # 0 = Purchased, 1 = Canceled
                return {"valid": False, "reason": "Purchase was canceled or refunded"}

            # 消費済みかチェック
            consumption_state = purchase.get('consumptionState')
            if consumption_state == 1:  # 1 = Consumed
                return {"valid": False, "reason": "Purchase already consumed"}

            # 注文ID（重複チェック用）
            order_id = purchase.get('orderId')

            # 確認成功の応答（acknowledge）
            service.purchases().products().acknowledge(
                packageName=package_name,
                productId=product_id,
                token=purchase_token
            ).execute()

            return {
                "valid": True,
                "product_id": product_id,
                "order_id": order_id,
                "purchase_time": purchase.get('purchaseTimeMillis'),
            }

        except Exception as e:
            logger.error(f"IAP verification failed: {e}")
            return {"valid": False, "reason": str(e)}
```

#### 2.2 App Store検証の実装

```python
def verify_ios_receipt(receipt_data: str, product_id: str) -> Dict:
    """App Storeのレシート検証"""

    # App Store Server API (推奨)
    # または旧レシート検証API
    url = "https://buy.itunes.apple.com/verifyReceipt"
    if settings.ENVIRONMENT == "production":
        url = "https://buy.itunes.apple.com/verifyReceipt"
    else:
        url = "https://sandbox.itunes.apple.com/verifyReceipt"

    payload = {
        "receipt-data": receipt_data,
        "password": settings.APP_STORE_SHARED_SECRET,
        "exclude-old-transactions": True,
    }

    response = requests.post(url, json=payload)
    result = response.json()

    if result.get("status") != 0:
        return {"valid": False, "reason": f"Status code {result.get('status')}"}

    # トランザクション情報を取得
    transactions = result.get("latest_receipt_info", [])
    for transaction in transactions:
        if transaction.get("product_id") == product_id:
            return {
                "valid": True,
                "product_id": product_id,
                "transaction_id": transaction.get("transaction_id"),
                "purchase_date": transaction.get("purchase_date_ms"),
            }

    return {"valid": False, "reason": "Product not found in receipt"}
```

### フェーズ3: フロントエンドの修正

**目標:** クライアント側の価格・クレジット情報を「表示用のみ」に変更

#### 3.1 商品情報の取得API

```python
# server/src/billing/router.py
@router.get("/billing/products")
async def get_products():
    """利用可能な商品一覧を返す（表示用）"""
    from .constants import PRODUCT_CATALOG

    products = [
        {
            "product_id": product_id,
            "name": info["name"],
            "description": info["description"],
            "credits": info["credits"],
            "price_jpy": info["price_jpy"],
        }
        for product_id, info in PRODUCT_CATALOG.items()
    ]

    return {"products": products}
```

#### 3.2 フロントエンドの修正

```typescript
// app/billing/constants/tokenPackages.ts
// 注意: この情報は表示用のみ。実際のクレジット数はサーバーが決定します。

export interface TokenPackage {
  productId: string;
  displayName: string;
  displayPrice: number;  // 表示用
  displayCredits: number;  // 表示用
}

// サーバーから取得した商品情報で上書き
export async function fetchProductCatalog(): Promise<TokenPackage[]> {
  const response = await api.get('/billing/products');
  return response.data.products.map((p: any) => ({
    productId: p.product_id,
    displayName: p.name,
    displayPrice: p.price_jpy,
    displayCredits: p.credits,
  }));
}
```

```typescript
// app/billing/BillingService.ts
async purchaseTokens(productId: string): Promise<void> {
  try {
    // アプリ内課金の実行
    const purchase = await RNIap.requestPurchase({
      sku: productId,
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
    });

    if (!purchase) {
      throw new Error('Purchase failed');
    }

    // サーバーに送信（creditsは送らない）
    const response = await api.post('/billing/add-credits', {
      product_id: productId,  // ← product_idのみ
      purchase_token: purchase.purchaseToken,  // Android
      // または transaction_receipt: purchase.transactionReceipt  // iOS
    });

    // 購入完了処理
    await RNIap.finishTransaction({
      purchase,
      isConsumable: true,
    });

    Alert.alert('購入完了', `${response.data.credits_added}クレジットを追加しました`);
  } catch (error) {
    logger.error('Purchase failed', { error });
    Alert.alert('購入失敗', '課金処理に失敗しました');
  }
}
```

### フェーズ4: モニタリングとアラート

**目標:** 不正な購入試行を検出・アラート

#### 4.1 異常検知ロジック

```python
# server/src/billing/fraud_detection.py
class FraudDetector:
    def detect_suspicious_activity(
        self,
        user_id: str,
        product_id: str,
        purchase_token: str
    ) -> List[str]:
        """疑わしいアクティビティを検出"""
        alerts = []

        # 1. 短時間に大量購入
        recent_purchases = self.db.query(PurchaseHistory).filter(
            PurchaseHistory.user_id == user_id,
            PurchaseHistory.purchased_at > datetime.now() - timedelta(hours=1)
        ).count()

        if recent_purchases > 10:
            alerts.append(f"Excessive purchases: {recent_purchases} in 1 hour")

        # 2. 無効なproduct_id
        from .constants import PRODUCT_CATALOG
        if product_id not in PRODUCT_CATALOG:
            alerts.append(f"Invalid product_id: {product_id}")

        # 3. purchase_tokenの再利用試行
        existing = self.db.query(PurchaseHistory).filter_by(
            purchase_token=purchase_token
        ).first()
        if existing:
            alerts.append(f"Duplicate purchase_token: {purchase_token}")

        return alerts
```

#### 4.2 ロギングとアラート

```python
# server/src/billing/service.py
def add_credits_from_purchase(self, product_id: str, purchase_token: str) -> Dict:
    # 不正検知
    fraud_detector = FraudDetector(db=self.db)
    alerts = fraud_detector.detect_suspicious_activity(
        user_id=self.user_id,
        product_id=product_id,
        purchase_token=purchase_token
    )

    if alerts:
        logger.warning(
            "Suspicious purchase activity detected",
            extra={
                "user_id": self.user_id,
                "product_id": product_id,
                "alerts": alerts,
            }
        )
        # Slackやメールで通知
        send_fraud_alert(user_id=self.user_id, alerts=alerts)

        # 深刻な場合はブロック
        if len(alerts) >= 2:
            raise ValueError("Suspicious activity detected. Purchase blocked.")

    # 通常の処理を続行
    # ...
```

## 受け入れ条件 (Acceptance Criteria)

### フェーズ1完了条件
- [ ] `PRODUCT_CATALOG`がサーバー側で定義される
- [ ] クライアントから`credits`パラメータが削除される
- [ ] サーバーが`product_id`のみからクレジット数を決定する
- [ ] `PurchaseHistory`テーブルが作成され、重複購入を防止する
- [ ] 無効な`product_id`でリクエストした場合、400エラーが返される

### フェーズ2完了条件
- [ ] Google Play Developer APIで購入情報を直接取得する
- [ ] 購入状態（購入済み/キャンセル済み）を検証する
- [ ] 消費済みトークンの再利用を検出してブロックする
- [ ] App Storeのレシート検証が実装される（iOSの場合）

### フェーズ3完了条件
- [ ] フロントエンドが`/billing/products`から商品情報を取得する
- [ ] クライアント側の`TOKEN_PACKAGES`は表示用のみとなる
- [ ] 購入リクエストに`credits`が含まれない
- [ ] サーバーレスポンスで付与されたクレジット数を受け取る

### フェーズ4完了条件
- [ ] 短時間の大量購入を検出する
- [ ] 無効なproduct_idの使用を検出する
- [ ] 重複購入トークンを検出する
- [ ] 不正試行時にSlack/メールでアラートが送信される
- [ ] 深刻な不正試行はブロックされる

### セキュリティ要件
- [ ] 価格決定ロジックがクライアント側から完全に除去される
- [ ] IAP検証がGoogle/Appleのサーバーから直接情報を取得する
- [ ] 購入トークンの重複使用が完全に防止される
- [ ] 全ての購入履歴がDBに記録される
- [ ] 異常な購入パターンがログに記録される

### テスト要件
- [ ] 正規の購入フローのE2Eテスト
- [ ] 無効なproduct_idでの購入試行テスト
- [ ] 重複purchase_tokenでの購入試行テスト
- [ ] 改ざんされたリクエストでの購入試行テスト（ペネトレーションテスト）
- [ ] IAP検証APIのモックテスト

## 関連ファイル (Related Files)

### バックエンド
- `server/src/billing/constants.py` - 商品カタログ定義
- `server/src/billing/service.py` - 課金ロジック
- `server/src/billing/router.py` - 課金API
- `server/src/billing/models.py` - PurchaseHistoryモデル
- `server/src/billing/iap_verification.py` - IAP検証
- `server/src/billing/fraud_detection.py` - 不正検知
- `server/src/billing/schemas.py` - リクエストスキーマ

### フロントエンド
- `app/billing/constants/tokenPackages.ts` - 商品パッケージ（表示用）
- `app/billing/BillingService.ts` - 課金処理
- `app/billing/screens/TokenShopScreen.tsx` - トークン購入画面

### データベース
- `server/alembic/versions/` - マイグレーションファイル

## 制約条件 (Constraints)

### 技術的制約
- **IAP検証API:** Google Play Developer API / App Store Server API
- **レート制限:** Google APIに1秒あたり10リクエスト制限あり
- **後方互換性:** 古いバージョンのアプリからのリクエストも一定期間サポート

### ビジネス制約
- **価格変更:** 商品カタログをサーバー側で管理することで、アプリ更新なしに価格変更可能
- **返金対応:** Google/Appleの返金ポリシーに準拠
- **税金:** 価格は税込み表示

### 運用制約
- **段階的ロールアウト:** まず新規ユーザーに適用、既存ユーザーは移行期間を設ける
- **ロールバックプラン:** 問題発生時は旧エンドポイントに切り戻し
- **モニタリング:** 購入成功率、失敗率、不正検知率を追跡

## 開発ログ (Development Log)

---
### 試行 #0 (初回分析)

- **試みたこと:** セキュリティ監査で価格改ざん脆弱性を発見
- **結果:** CRITICAL脆弱性として分類、詳細な実装計画を作成
- **メモ:** フェーズ1のサーバー側検証を最優先で実装すべき

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- 課金システムの価格改ざん脆弱性を特定しました
- 4フェーズの実装計画を策定しました
- まだ実装は開始していません

### 次のアクション
1. **最優先:** フェーズ1（サーバー側商品カタログ）の実装
   - `server/src/billing/constants.py`に`PRODUCT_CATALOG`を作成
   - `PurchaseHistory`モデルの追加
   - `add_credits_from_purchase`メソッドの実装
   - APIエンドポイントのスキーマ変更

2. **並行作業:** IAP検証の強化 (フェーズ2)
   - Google Play Developer APIの統合
   - 購入状態の検証ロジック

3. **テスト:** 各フェーズ完了後にペネトレーションテストを実施

### 考慮事項/ヒント
- **重複防止が最重要:** `purchase_token`をUNIQUE制約で管理
- **IAP検証は外部API呼び出し:** タイムアウトやエラーハンドリングを適切に
- **ロールバック計画:** 旧エンドポイントは移行期間中も稼働させる
- **価格変更の柔軟性:** サーバー側カタログにより、アプリ更新なしに価格変更可能に

### 参考資料
- [Google Play Billing API](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products)
- [App Store Server API](https://developer.apple.com/documentation/appstoreserverapi)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
