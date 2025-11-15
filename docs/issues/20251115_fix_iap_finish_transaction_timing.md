---
filename: 20251115_fix_iap_finish_transaction_timing
status: new
priority: critical
attempt_count: 0
tags: [billing, IAP, bug, security, financial-risk]
date: 2025/11/15
---

## 概要 (Overview)

**🚨 CRITICAL BUG 🚨**

現在の実装では、`finishTransaction()` がバックエンドのレシート検証**成功後**に呼ばれている。しかし、バックエンド検証が失敗した場合、ユーザーは決済したのにクレジットを受け取れず、Google Play側では購入が消費済みになるため復元も不可能になる。

これは**金銭的損失を引き起こす深刻なバグ**である。

## 背景 (Background)

### 現在の実装（問題あり）

```typescript
// app/screen/token-purchase/hooks/usePurchaseHandlers.ts:114-124

// バックエンドにクレジットを追加
await billingService.addCredits(pkg.credits, purchaseRecord);
console.log('[usePurchaseHandlers] Backend addCredits successful');

// バックエンド検証成功後にトランザクションを完了 ← 🔴 問題！
const { finishTransaction } = await import('react-native-iap');
await finishTransaction({ purchase, isConsumable: true });
console.log('[usePurchaseHandlers] Transaction finished after backend verification');
```

### 問題のシナリオ

#### シナリオ1: バックエンドAPI呼び出し失敗（ネットワークエラー）
```
1. ユーザーが購入ボタンをタップ
2. Google Playで決済完了（ユーザーは課金される）
3. purchaseUpdatedListener 発火
4. billingService.addCredits() を呼び出し
5. ❌ ネットワークエラーで失敗
6. ✅ finishTransaction() は呼ばれない（Good!）
7. ❌ しかし、ユーザーにはエラーメッセージが表示される
8. ❌ 購入は未完了のまま残るが、復元処理が未実装
```

**現状の問題:**
- 復元処理（`restoreTokenPurchases()`）が実装されているが**呼び出されていない**
- ユーザーは決済したのにクレジットを受け取れない

#### シナリオ2: バックエンドレシート検証失敗
```
1. ユーザーが購入ボタンをタップ
2. Google Playで決済完了
3. purchaseUpdatedListener 発火
4. billingService.addCredits() を呼び出し
5. バックエンドで verify_purchase() が失敗（レシート不正など）
6. ❌ HTTPException 400 が返される
7. ✅ finishTransaction() は呼ばれない（Good!）
8. ❌ しかし、ユーザーは正当に決済したのにクレジット未付与
```

#### シナリオ3: アプリクラッシュ（バックエンド呼び出し前）
```
1. ユーザーが購入ボタンをタップ
2. Google Playで決済完了
3. purchaseUpdatedListener 発火
4. バックエンド呼び出し前にアプリがクラッシュ
5. ❌ finishTransaction() は呼ばれていない
6. ❌ 復元処理が未実装のため、クレジット未付与のまま
```

### Explorerの調査結果

> **A1. finishTransaction のタイミング問題 ⚠️ CRITICAL**
>
> - `finishTransaction()` がバックエンド検証**成功後**に呼ばれている（usePurchaseHandlers.ts:122-123）
> - しかし、バックエンド検証が失敗した場合、ユーザーは決済したのにクレジットを受け取れない
> - Google Play側では購入が消費済みになるため、復元も不可能
>
> **影響範囲:**
> - ユーザーの金銭的損失
> - サポート対応の増加
> - アプリストアレビューの低評価

## 実装方針 (Implementation Strategy)

### 修正案1: 例外処理でfinishTransactionをスキップ

```typescript
// usePurchaseHandlers.ts:114-130

try {
  // バックエンドにクレジットを追加
  logger.info('billing', 'Sending credits to backend', { credits: pkg.credits });
  await billingService.addCredits(pkg.credits, purchaseRecord);
  logger.info('billing', 'Backend verification successful');

  // ✅ バックエンド成功時のみfinishTransaction
  const { finishTransaction } = await import('react-native-iap');
  await finishTransaction({ purchase, isConsumable: true });
  logger.info('billing', 'Transaction finished successfully');

} catch (error) {
  // ❌ バックエンド失敗時はfinishTransactionを呼ばない
  // → 未完了トランザクションとして残る
  // → アプリ再起動時にrestoreTokenPurchases()で復元可能

  logger.error('billing', 'Backend verification failed, transaction not finished', error);

  // ユーザーに適切なメッセージを表示
  Alert.alert(
    '処理中',
    '購入の確認中です。しばらくしてから再度アプリを起動してください。\n\nクレジットは自動的に追加されます。',
    [{ text: 'OK' }]
  );

  // エラーを再スロー（setPurchasing(false)に到達）
  throw error;
}
```

### 修正案2: 未完了トランザクションの復元処理を実装

**重要:** この修正は別issue（`20251115_implement_pending_purchase_restoration`）で実装する。

```typescript
// App.tsx または InitializationManager

useEffect(() => {
  const restorePendingPurchases = async () => {
    try {
      await initializeTokenIAP();
      const pendingPurchases = await restoreTokenPurchases();

      if (pendingPurchases.length > 0) {
        logger.info('billing', `Found ${pendingPurchases.length} pending purchases`);

        // 各未完了購入を処理
        for (const purchase of pendingPurchases) {
          await processPendingPurchase(purchase);
        }
      }
    } catch (error) {
      logger.error('billing', 'Failed to restore purchases', error);
    }
  };

  restorePendingPurchases();
}, []);
```

## 受け入れ条件 (Acceptance Criteria)

### コード修正
- [ ] `usePurchaseHandlers.ts` の `handleTokenPurchase()` を修正
  - [ ] try-catch でバックエンド呼び出しをラップ
  - [ ] 成功時のみ `finishTransaction()` を呼ぶ
  - [ ] 失敗時は適切なユーザーメッセージを表示
  - [ ] console.log を logger に置き換え（別issueで対応）

### エラーハンドリング
- [ ] バックエンドエラー時のユーザーメッセージを改善
  - [ ] 「購入の確認中です。しばらくしてから再度アプリを起動してください」
  - [ ] パニックを引き起こさない文言
- [ ] ネットワークエラー時の特別な処理
  - [ ] リトライの提案（オプション）

### テスト
- [ ] ネットワークエラーのシミュレーション
  - [ ] 機内モードで購入
  - [ ] finishTransaction が呼ばれないことを確認
  - [ ] アプリ再起動後、未完了トランザクションが残っていることを確認
- [ ] バックエンドエラーのシミュレーション
  - [ ] バックエンドを停止して購入
  - [ ] 同様に未完了トランザクションが残ることを確認
- [ ] 正常系のテスト
  - [ ] 通常の購入フローが正常に動作することを確認

### ドキュメント
- [ ] コード内コメントを追加
  - [ ] なぜtry-catchが必要か
  - [ ] 未完了トランザクションの復元の重要性
- [ ] `/docs/billing/purchase-flow-guide.md` を更新（別issueで作成）

## 関連ファイル (Related Files)

### 修正対象
- `app/screen/token-purchase/hooks/usePurchaseHandlers.ts` - メインの修正箇所

### 関連実装（別issueで対応）
- `app/billing/services/tokenIapService.ts` - `restoreTokenPurchases()` は既に実装済み
- `app/initialization/InitializationManager.tsx` - 復元処理の呼び出し先候補
- `App.tsx` - 復元処理の呼び出し先候補

### バックエンド（確認のみ）
- `server/src/billing/router.py` - レシート検証エンドポイント
- `server/src/billing/iap_verification.py` - verify_purchase()

## 制約条件 (Constraints)

1. **後方互換性**
   - 既存の購入フローを壊さないこと
   - モック購入機能も引き続き動作すること

2. **ユーザー体験**
   - エラーメッセージはパニックを引き起こさない
   - 「クレジットは後で追加されます」という安心感を与える

3. **テスト可能性**
   - ネットワークエラーをシミュレートできること
   - 未完了トランザクションを人為的に作成できること

4. **セキュリティ**
   - finishTransactionのスキップが悪用されないこと
   - バックエンドのレシート検証は必須

## 開発ログ (Development Log)

---
### 試行 #1

*（作業開始前）*

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- **CRITICAL BUG** として識別済み
- Explorerの調査により、finishTransactionのタイミング問題が確認された
- 現在の実装では、バックエンド検証成功後にfinishTransactionを呼んでいる
- バックエンド失敗時、ユーザーは決済したのにクレジット未付与

### 次のアクション

#### Step 1: コード修正
1. `usePurchaseHandlers.ts:114-130` を開く
2. `billingService.addCredits()` 呼び出しを try-catch でラップ
3. 成功時のみ `finishTransaction()` を呼ぶ
4. 失敗時は適切なAlertを表示し、エラーを再スロー

#### Step 2: エラーメッセージの改善
- 現在: 「購入エラー」「予期しないエラー」
- 改善後: 「購入の確認中です。クレジットは自動的に追加されます」

#### Step 3: ログの改善
- console.log を logger に置き換え（別issueと並行可能）
- エラー時に詳細情報をログ出力

#### Step 4: テスト
- 開発環境でネットワークエラーをシミュレート
- finishTransactionが呼ばれないことをログで確認

### 考慮事項/ヒント
- **重要:** 復元処理（`restoreTokenPurchases()`）の実装は別issue
- この修正単体では完全な解決にならないが、最悪のケースを防ぐ
- Google Play Developer ドキュメント: "Acknowledge purchases within 3 days"
- 3日以内に復元処理を実装しないと、Google側で自動返金される可能性がある

### 関連Issue
- `20251115_implement_pending_purchase_restoration` - 未完了トランザクション復元（次に作成）
