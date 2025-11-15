---
filename: 20251115_console_log_to_logger_migration
status: new
priority: high
attempt_count: 0
tags: [code-quality, logging, refactoring, auth, billing]
date: 2025/11/15
---

## 概要 (Overview)

認証システムと課金システム全体で `console.log/warn/error` が多用されており、構造化ログシステム（`logger.ts`）との不整合が発生している。全てのconsole出力をloggerに統一し、ログレベルの制御を可能にする。

## 背景 (Background)

Explorerによる徹底調査の結果、以下の問題が発見された：

### 認証システム
- `authenticateDevice.ts`: 10箇所のconsole.log/warn/error
- `authApiClient.ts`: 2箇所のconsole.error
- `deviceIdService.ts`: 正しくloggerを使用（良い例）

### 課金・IAPシステム
- `tokenIapService.ts`: 18箇所のconsole.log/error
- `usePurchaseHandlers.ts`: 11箇所のconsole.log/error
- `billingApiService.ts`: console.logとloggerが混在

### 問題点
1. **ログレベルフィルタリングが機能しない**
   - `EXPO_PUBLIC_LOG_LEVEL` でログレベルを制御できるはずだが、console.logは無視される
   - 本番環境でデバッグログが出力されてしまう

2. **ログの一貫性がない**
   - フォーマットがバラバラ（`[Auth]`, `[Token IAP]`, カテゴリなしなど）
   - 検索・分析が困難

3. **セキュリティリスク**
   - 重要度に関わらず全て出力されるため、機密情報が漏洩しやすい

## 実装方針 (Implementation Strategy)

### 1. 段階的な移行
各ファイルを以下のパターンで修正：

```typescript
// Before
console.log('[Auth] Device ID obtained:', deviceId);
console.warn('[Auth] Verification failed:', error);
console.error('[Auth] Registration error:', error);

// After
logger.info('auth', 'Device ID obtained', { deviceIdPrefix: deviceId.substring(0, 8) });
logger.warn('auth', 'Verification failed', error);
logger.error('auth', 'Registration error', error);
```

### 2. カテゴリの統一
- 認証関連: `'auth'` カテゴリ（既存）
- 課金関連: `'billing'` カテゴリを新規追加

### 3. 機密情報のマスキング
デバイスID、ユーザーID、トランザクションIDなどは部分マスク：
```typescript
// 悪い例
logger.info('auth', 'Device ID', { deviceId }); // 全体が出力される

// 良い例
logger.info('auth', 'Device ID obtained', {
  deviceIdPrefix: deviceId.substring(0, 8)
});
```

## 受け入れ条件 (Acceptance Criteria)

- [ ] 認証システムのconsole.log/warn/errorを全てloggerに置き換え
  - [ ] `app/initialization/tasks/authenticateDevice.ts`
  - [ ] `app/auth/authApiClient.ts`
- [ ] 課金システムのconsole.log/warn/errorを全てloggerに置き換え
  - [ ] `app/billing/services/tokenIapService.ts`
  - [ ] `app/screen/token-purchase/hooks/usePurchaseHandlers.ts`
  - [ ] `app/billing/services/billingApiService.ts`
- [ ] `logger.ts` に `'billing'` カテゴリを追加
- [ ] TypeScriptの型チェックをパス（`npx tsc --noEmit`）
- [ ] 開発環境でログが正常に出力されることを確認
- [ ] `EXPO_PUBLIC_LOG_LEVEL=error` でdebug/infoログが抑制されることを確認

## 関連ファイル (Related Files)

### 修正対象ファイル
- `app/utils/logger.ts` - LogCategoryに 'billing' を追加
- `app/initialization/tasks/authenticateDevice.ts` - 10箇所のconsole.*を修正
- `app/auth/authApiClient.ts` - 2箇所のconsole.errorを修正
- `app/billing/services/tokenIapService.ts` - 18箇所のconsole.*を修正
- `app/screen/token-purchase/hooks/usePurchaseHandlers.ts` - 11箇所のconsole.*を修正
- `app/billing/services/billingApiService.ts` - console.logをloggerに統一
- `app/initialization/tasks/initializeBillingService.ts` - 6箇所のconsole.*を修正

### 参考実装
- `app/auth/deviceIdService.ts` - loggerの正しい使用例

## 制約条件 (Constraints)

1. **既存のログメッセージは可能な限り保持**
   - メッセージ内容を大きく変更しない
   - デバッグ時の追跡可能性を維持

2. **機密情報を含むログは部分マスク必須**
   - デバイスID: 最初の8文字のみ
   - ユーザーID: 最初の8文字のみ
   - トランザクションID: 最初の12文字のみ

3. **ログレベルの適切な選択**
   - `debug`: 開発時のみ必要な詳細情報
   - `info`: 通常の動作フロー（認証成功、購入完了など）
   - `warn`: 異常だが続行可能（検証失敗→再登録など）
   - `error`: エラー発生、処理失敗

4. **本番環境での動作確認**
   - `.env.production` で `EXPO_PUBLIC_LOG_LEVEL=error` を設定
   - debug/infoログが出力されないことを確認

## 開発ログ (Development Log)

---
### 試行 #1

*（作業開始前）*

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- Explorerによる徹底調査が完了
- 認証システムと課金システムでconsole.logが40箇所以上使用されていることを確認
- `deviceIdService.ts` が正しいlogger使用の参考実装として存在

### 次のアクション
1. `logger.ts` に `'billing'` カテゴリを追加
2. 各ファイルを順次修正：
   - `authenticateDevice.ts` から開始（影響範囲が大きい）
   - `authApiClient.ts`
   - `tokenIapService.ts`（最も多い18箇所）
   - `usePurchaseHandlers.ts`
   - `billingApiService.ts`
   - `initializeBillingService.ts`
3. 修正後、TypeScript型チェックとビルドテストを実行
4. 開発環境でログ出力を確認

### 考慮事項/ヒント
- `deviceIdService.ts:38,54,84` が良い参考例
- ユーザーキャンセルは `info` レベル（`tokenIapService.ts:150`）
- エラーログには可能な限りスタックトレースを含める
- `logger.info('category', 'message', { data })` の形式で構造化データを渡す
