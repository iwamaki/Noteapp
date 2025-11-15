---
filename: 20251115_implement_pending_purchase_restoration
status: new
priority: critical
attempt_count: 0
tags: [billing, IAP, feature, financial-risk]
date: 2025/11/15
---

## 概要 (Overview)

**🚨 CRITICAL FEATURE 🚨**

アプリクラッシュやネットワークエラー時に未完了となった購入トランザクションを、アプリ起動時に自動的に検出・復元する機能を実装する。これにより、ユーザーが決済したのにクレジットを受け取れない問題を解決する。

## 背景 (Background)

### 現在の状況

`tokenIapService.ts` に `restoreTokenPurchases()` 関数は既に実装されているが、**どこからも呼び出されていない**。

```typescript
// app/billing/services/tokenIapService.ts:185-201

export async function restoreTokenPurchases(): Promise<Purchase[]> {
  try {
    const purchases = await getAvailablePurchases();
    console.log('[Token IAP] Checking for pending token purchases:', purchases);

    // トークンパッケージのみをフィルタリング
    const tokenPurchases = purchases.filter((purchase) => {
      const productId = purchase.productId;
      return TOKEN_PRODUCT_IDS.includes(productId);
    });

    return tokenPurchases;
  } catch (error) {
    console.error('[Token IAP] Failed to restore token purchases:', error);
    return [];
  }
}
```

### 問題のシナリオ

#### シナリオ1: アプリクラッシュ（購入中）
```
1. ユーザーが購入ボタンをタップ
2. Google Playで決済完了（ユーザーは課金される）
3. purchaseUpdatedListener 発火
4. バックエンド呼び出し前にアプリがクラッシュ💥
5. ❌ クレジット未付与
6. ❌ finishTransaction() 未実行（Google Play側は未確認状態）
7. ❌ ユーザーが再起動しても、復元処理がないため放置される
```

#### シナリオ2: ネットワーク切断（購入後）
```
1. ユーザーが購入ボタンをタップ
2. Google Playで決済完了
3. purchaseUpdatedListener 発火
4. billingService.addCredits() 呼び出し
5. ❌ ネットワークエラーで失敗
6. ❌ finishTransaction() は呼ばれない（正しい動作）
7. ✅ 未完了トランザクションとして残る
8. ❌ しかし、復元処理がないため、ユーザーはクレジットを受け取れない
```

### Explorerの調査結果

> **A2. 未完了トランザクションの処理が未実装 ⚠️ CRITICAL**
>
> - `restoreTokenPurchases()` は実装されているが（tokenIapService.ts:185-201）、**呼び出されていない**
> - アプリクラッシュやネットワークエラー時の未完了購入が放置される
>
> **推奨対策:**
> ```typescript
> // App.tsx の初期化処理に追加
> useEffect(() => {
>   const checkPendingPurchases = async () => {
>     const pendingPurchases = await restoreTokenPurchases();
>     if (pendingPurchases.length > 0) {
>       for (const purchase of pendingPurchases) {
>         await processPendingPurchase(purchase);
>       }
>     }
>   };
>   checkPendingPurchases();
> }, []);
> ```

### Google Playのポリシー

> **重要:** Google Playは、購入が確認されない（acknowledge されない）場合、**3日後に自動的に返金**する。
>
> つまり、未完了トランザクションを3日以内に処理しないと：
> 1. ユーザーには返金される（Good）
> 2. しかし、開発者は手数料を失う（Bad）
> 3. ユーザーは「購入できなかった」と不満を持つ（Bad）

## 実装方針 (Implementation Strategy)

### 1. 復元処理の実装場所

#### オプションA: InitializationManager（推奨）
- 既存の初期化タスクシステムを活用
- エラーハンドリングとリトライが組み込み済み
- 優先度を CRITICAL に設定

```typescript
// app/initialization/tasks/restorePendingPurchases.ts (新規作成)

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { restoreTokenPurchases } from '../../billing/services/tokenIapService';
import { logger } from '../../utils/logger';

export const restorePendingPurchases: InitializationTask = {
  id: 'restore_pending_purchases',
  name: '未完了購入の復元',
  description: '未完了の購入トランザクションを検出し、クレジットを追加します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.HIGH,
  timeout: 30000, // 30秒
  retry: 3,

  execute: async () => {
    try {
      const pendingPurchases = await restoreTokenPurchases();

      if (pendingPurchases.length === 0) {
        logger.info('billing', 'No pending purchases found');
        return;
      }

      logger.info('billing', `Found ${pendingPurchases.length} pending purchases`);

      // 各未完了購入を処理
      for (const purchase of pendingPurchases) {
        await processPendingPurchase(purchase);
      }

      logger.info('billing', 'All pending purchases processed successfully');

    } catch (error) {
      logger.error('billing', 'Failed to restore pending purchases', error);
      throw error;
    }
  },
};
```

#### オプションB: App.tsx
- シンプルだが、エラーハンドリングを自前で実装する必要がある
- 初期化タスクとの順序制御が難しい

### 2. processPendingPurchase() の実装

```typescript
// app/billing/services/purchaseRestoration.ts (新規作成)

import { Purchase } from 'react-native-iap';
import { finishTransaction } from 'react-native-iap';
import { getBillingApiService } from './billingApiService';
import { TOKEN_PACKAGES } from '../constants/tokenPackages';
import { PurchaseRecord } from '../../settings/settingsStore';
import { logger } from '../../utils/logger';

/**
 * 未完了購入を処理する
 *
 * フロー:
 * 1. purchase から productId を取得
 * 2. TOKEN_PACKAGES からクレジット数を取得
 * 3. バックエンドにクレジットを追加
 * 4. 成功時のみ finishTransaction() を呼ぶ
 * 5. 失敗時はエラーをスローし、次回リトライ
 */
export async function processPendingPurchase(purchase: Purchase): Promise<void> {
  const productId = purchase.productId;

  logger.info('billing', 'Processing pending purchase', {
    productId,
    transactionId: purchase.transactionId
  });

  // productId からクレジット数を取得
  const pkg = TOKEN_PACKAGES.find((p) => p.productId === productId);
  if (!pkg) {
    logger.error('billing', 'Unknown product ID in pending purchase', { productId });
    // 不明な商品IDの場合はfinishTransactionして削除
    await finishTransaction({ purchase, isConsumable: true });
    return;
  }

  // 購入レコードを作成
  const purchaseRecord: PurchaseRecord = {
    id: purchase.transactionId || `restored_${Date.now()}`,
    type: pkg.isInitial ? 'initial' : 'addon',
    productId: pkg.productId,
    purchaseToken: purchase.purchaseToken || '',
    transactionId: purchase.transactionId || '',
    purchaseDate: new Date(purchase.transactionDate).toISOString(),
    amount: pkg.price,
    creditsAdded: pkg.credits,
  };

  try {
    // バックエンドにクレジットを追加
    const billingService = getBillingApiService();
    await billingService.addCredits(pkg.credits, purchaseRecord);

    logger.info('billing', 'Backend verification successful for pending purchase', {
      productId,
      credits: pkg.credits
    });

    // 成功時のみfinishTransaction
    await finishTransaction({ purchase, isConsumable: true });

    logger.info('billing', 'Pending purchase completed successfully', { productId });

  } catch (error) {
    // バックエンド失敗時はエラーをスロー
    // 次回アプリ起動時に再度リトライされる
    logger.error('billing', 'Failed to process pending purchase', {
      productId,
      error
    });
    throw error;
  }
}
```

### 3. 初期化タスクへの登録

```typescript
// app/initialization/InitializationManager.tsx

import { restorePendingPurchases } from './tasks/restorePendingPurchases';

const TASKS: InitializationTask[] = [
  // ... existing tasks
  authenticateDevice,
  initializeBillingService,
  restorePendingPurchases, // ← 追加（認証とIAP初期化の後）
  // ... other tasks
];
```

### 4. エッジケースの処理

#### ケース1: 二重購入（transaction_id 重複）
```typescript
// バックエンドが 409 Conflict を返す
catch (error) {
  if (error.response?.status === 409) {
    // 既に処理済み → finishTransactionして削除
    logger.info('billing', 'Purchase already processed, finishing transaction');
    await finishTransaction({ purchase, isConsumable: true });
    return;
  }
  throw error;
}
```

#### ケース2: ネットワークエラー
```typescript
// リトライ可能なエラー → 次回アプリ起動時に再度リトライ
// エラーをスローするだけでOK（InitializationTaskのリトライ機構が動作）
```

#### ケース3: レシート検証失敗
```typescript
// バックエンドが 400 Bad Request を返す
// → ログを記録し、finishTransactionして削除（不正な購入）
catch (error) {
  if (error.response?.status === 400) {
    logger.warn('billing', 'Invalid receipt in pending purchase, finishing transaction');
    await finishTransaction({ purchase, isConsumable: true });
    return;
  }
  throw error;
}
```

## 受け入れ条件 (Acceptance Criteria)

### 実装
- [ ] `app/billing/services/purchaseRestoration.ts` を新規作成
  - [ ] `processPendingPurchase()` 関数を実装
  - [ ] エラーハンドリング（二重購入、レシート検証失敗など）
- [ ] `app/initialization/tasks/restorePendingPurchases.ts` を新規作成
  - [ ] InitializationTask として実装
  - [ ] stage: CRITICAL, priority: HIGH
  - [ ] timeout: 30秒, retry: 3回
- [ ] `InitializationManager.tsx` に新タスクを登録
  - [ ] `authenticateDevice` と `initializeBillingService` の後

### ログ改善
- [ ] `tokenIapService.ts` の `restoreTokenPurchases()` を logger に移行
- [ ] `purchaseRestoration.ts` で詳細なログを出力

### テスト
- [ ] 未完了トランザクションの作成テスト
  - [ ] ネットワークを切断して購入
  - [ ] アプリをクラッシュさせる
- [ ] 復元処理のテスト
  - [ ] アプリ再起動時に未完了購入が検出されることを確認
  - [ ] クレジットが正しく追加されることを確認
  - [ ] finishTransaction() が呼ばれることを確認
- [ ] エッジケースのテスト
  - [ ] 二重購入（409 Conflict）
  - [ ] レシート検証失敗（400 Bad Request）
  - [ ] ネットワークエラー（リトライ）

### ユーザー通知（オプション）
- [ ] 復元処理成功時にトースト通知
  - [ ] 「未完了の購入が見つかりました。〇〇Pを追加しました」
- [ ] 復元処理失敗時の通知
  - [ ] 「購入の確認中です。しばらくお待ちください」

## 関連ファイル (Related Files)

### 新規作成
- `app/billing/services/purchaseRestoration.ts` - processPendingPurchase()
- `app/initialization/tasks/restorePendingPurchases.ts` - InitializationTask

### 修正対象
- `app/initialization/InitializationManager.tsx` - タスク登録
- `app/billing/services/tokenIapService.ts` - console.log → logger

### 参考実装
- `app/initialization/tasks/authenticateDevice.ts` - InitializationTaskの例
- `app/screen/token-purchase/hooks/usePurchaseHandlers.ts` - 通常の購入フロー

## 制約条件 (Constraints)

1. **3日以内の処理**
   - Google Playは3日以内に acknowledge されない購入を自動返金
   - 復元処理は可能な限り早く実行すること

2. **冪等性**
   - 同じ購入を複数回処理しても問題ないこと
   - バックエンドの二重購入防止機構に依存

3. **パフォーマンス**
   - アプリ起動時間に大きな影響を与えないこと
   - タイムアウトは30秒以内

4. **エラーハンドリング**
   - 復元処理の失敗はアプリ起動を阻害しないこと
   - ログを詳細に記録し、トラブルシューティングを容易に

5. **ユーザー体験**
   - バックグラウンドで静かに処理
   - 成功時のみ通知（オプション）

## 開発ログ (Development Log)

---
### 試行 #1

*（作業開始前）*

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- `restoreTokenPurchases()` は既に実装されているが、呼び出されていない
- 未完了トランザクションの復元機能が完全に欠けている
- Google Playの3日ルールにより、早急な実装が必要

### 次のアクション

#### Step 1: purchaseRestoration.ts の作成
1. `app/billing/services/purchaseRestoration.ts` を新規作成
2. `processPendingPurchase()` 関数を実装
3. エラーハンドリング（409, 400, ネットワークエラー）

#### Step 2: restorePendingPurchases タスクの作成
1. `app/initialization/tasks/restorePendingPurchases.ts` を新規作成
2. InitializationTask として実装
3. `processPendingPurchase()` を呼び出し

#### Step 3: InitializationManager への登録
1. `InitializationManager.tsx` を開く
2. `restorePendingPurchases` をインポート
3. TASKS 配列に追加（`initializeBillingService` の後）

#### Step 4: テスト
1. ネットワーク切断して購入
2. アプリ再起動
3. ログで復元処理を確認

### 考慮事項/ヒント
- `authenticateDevice.ts` を参考にInitializationTaskを実装
- `usePurchaseHandlers.ts:99-138` を参考に購入処理を実装
- `billingApiService.addCredits()` は既存のAPIを再利用
- エラー時は throw するだけ（InitializationTaskがリトライ）
- 二重購入（409）と不正レシート（400）は finishTransaction して削除

### 関連Issue
- `20251115_fix_iap_finish_transaction_timing` - finishTransactionのタイミング修正（前提条件）
- `20251115_console_log_to_logger_migration` - ログ統一（並行作業可能）
