---
filename: 20251115_secure_logging_sensitive_data_masking
status: new
priority: high
attempt_count: 0
tags: [security, logging, auth, OWASP]
date: 2025/11/15
---

## 概要 (Overview)

認証システムのログ出力において、デバイスID・ユーザーIDなどの機密情報が平文で記録されている。ログ漏洩時のアカウント乗っ取りリスクを軽減するため、機密情報のマスキングを実装する。

## 背景 (Background)

### セキュリティ監査の結果

Explorerによる調査で以下の深刻なセキュリティリスクが発見された：

#### フロントエンド（TypeScript）
```typescript
// app/auth/deviceIdService.ts:38
logger.info('auth', 'New device ID generated and stored in SecureStore',
  { deviceId: newDeviceId }); // ❌ デバイスID全体が平文

// app/auth/deviceIdService.ts:54
logger.info('auth', 'User ID saved to SecureStore',
  { userId }); // ❌ ユーザーID全体が平文

// app/initialization/tasks/authenticateDevice.ts:23,29,64
console.log(`[Auth] Device ID: ${deviceId}`); // ❌ console.log + 平文
console.log(`[Auth] Existing user ID found: ${existingUserId}`); // ❌
```

#### バックエンド（Python）
```python
# server/src/auth/dependencies.py:43
logger.warning(
    "Authentication failed: Invalid device ID format",
    extra={"device_id": device_id[:20] + "..."}  # ❌ 20文字は多すぎる
)

# server/src/auth/dependencies.py:54-61
logger.warning(
    "Authentication failed: Device not found",
    extra={"device_id": device_id}  # ❌ デバイスID全体
)
```

### リスク評価

**CVSS Score: 7.5 (High)**
- **攻撃ベクトル:** ログファイルへのアクセス（開発環境、本番環境、サードパーティログサービス）
- **影響:** アカウント乗っ取り、なりすまし
- **OWASP分類:** A09:2021 – Security Logging and Monitoring Failures

### 実際の攻撃シナリオ
1. 攻撃者がログファイルにアクセス（サーバー侵害、内部犯行、誤公開など）
2. デバイスIDとユーザーIDを抽出
3. `X-Device-ID` ヘッダーに抽出したIDを設定してAPI呼び出し
4. 認証が通り、他人のアカウントにアクセス可能

## 実装方針 (Implementation Strategy)

### 1. フロントエンド（TypeScript）

#### 部分マスキング
```typescript
// Before
logger.info('auth', 'New device ID generated', { deviceId: newDeviceId });

// After
logger.info('auth', 'New device ID generated', {
  deviceIdPrefix: newDeviceId.substring(0, 8) // 最初の8文字のみ
});
```

#### 環境別の出力制御
```typescript
// 開発環境では詳細を出力、本番環境では最小限に
if (__DEV__) {
  logger.debug('auth', 'Full device ID for debugging', { deviceId });
} else {
  logger.info('auth', 'Device ID obtained', {
    deviceIdPrefix: deviceId.substring(0, 8)
  });
}
```

### 2. バックエンド（Python）

#### ハッシュ化ヘルパー関数の作成
```python
# server/src/auth/utils.py
import hashlib

def mask_device_id(device_id: str) -> str:
    """デバイスIDをハッシュ化してログ用にマスク"""
    return hashlib.sha256(device_id.encode()).hexdigest()[:16]

def mask_user_id(user_id: str) -> str:
    """ユーザーIDの最初の8文字のみ返す"""
    return user_id[:8] if len(user_id) > 8 else user_id
```

#### 使用例
```python
# Before
logger.warning("Device not found", extra={"device_id": device_id})

# After
logger.warning("Device not found", extra={
    "device_id_hash": mask_device_id(device_id)
})
```

### 3. 機密情報のカテゴリ

| データ | マスキング方法 | 理由 |
|--------|--------------|------|
| デバイスID（UUID） | SHA256の最初の16文字 | 完全な一意性は不要、追跡可能性を保持 |
| ユーザーID | 最初の8文字 | プレフィックス `user_` で判別可能 |
| トランザクションID | 最初の12文字 | 購入トラブルシューティング用 |
| purchaseToken | 記録しない | 完全に秘密、レシートの再検証に使用可能 |

## 受け入れ条件 (Acceptance Criteria)

### フロントエンド
- [ ] `deviceIdService.ts` の全ログでデバイスID・ユーザーIDをマスキング
  - [ ] `getOrCreateDeviceId()`: deviceIdPrefix のみ出力
  - [ ] `saveUserId()`: userIdPrefix のみ出力
  - [ ] `clearAuthData()`: IDを出力しない
- [ ] `authenticateDevice.ts` の全ログでマスキング
  - [ ] 既存のconsole.log を logger に変換（別issue）
  - [ ] デバイスID・ユーザーIDは部分マスク
- [ ] `authApiClient.ts` のエラーログでマスキング

### バックエンド
- [ ] `server/src/auth/utils.py` にマスキングヘルパー関数を追加
  - [ ] `mask_device_id()` - SHA256ハッシュ
  - [ ] `mask_user_id()` - 最初の8文字
- [ ] `dependencies.py` の全ログでマスキング適用
  - [ ] `verify_user()`: device_id_hash を使用
- [ ] `router.py` のログでマスキング適用
- [ ] `service.py` のログでマスキング適用

### テスト
- [ ] ログ出力をキャプチャし、平文のデバイスID・ユーザーIDが含まれていないことを確認
- [ ] 開発環境（`__DEV__=true`）でのみ詳細ログが出力されることを確認
- [ ] 本番環境相当（`ENV=production`）でマスキングが機能することを確認

## 関連ファイル (Related Files)

### フロントエンド
- `app/auth/deviceIdService.ts` - 3箇所のログを修正
- `app/initialization/tasks/authenticateDevice.ts` - 複数箇所のログを修正
- `app/auth/authApiClient.ts` - エラーログを修正

### バックエンド
- `server/src/auth/utils.py` - **新規作成**
- `server/src/auth/dependencies.py` - 2箇所のログを修正
- `server/src/auth/router.py` - ログを修正
- `server/src/auth/service.py` - ログを修正

## 制約条件 (Constraints)

1. **トラブルシューティング能力の維持**
   - 完全に情報を隠すのではなく、追跡可能性を保持
   - プレフィックスやハッシュで問題の特定が可能なこと

2. **パフォーマンス**
   - SHA256ハッシュ計算はログ出力時のみ（ホットパスでは使用しない）
   - キャッシングは不要（ログは低頻度）

3. **GDPR/個人情報保護法対応**
   - ログは個人を特定できる情報を含まないこと
   - ハッシュ化された情報は個人情報に該当しない

4. **セキュリティレビュー**
   - 全てのログ出力コードをレビュー
   - 新規コードでは機密情報のログ出力を禁止

## 開発ログ (Development Log)

---
### 試行 #1

*（作業開始前）*

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- セキュリティ監査により、認証システム全体で機密情報の平文ログが発見された
- OWASP A09（Security Logging and Monitoring Failures）に該当する深刻な問題
- フロントエンド3ファイル + バックエンド3ファイルの修正が必要

### 次のアクション

#### Step 1: バックエンドのヘルパー関数作成
1. `server/src/auth/utils.py` を新規作成
2. `mask_device_id()` と `mask_user_id()` を実装
3. 単体テストを作成（オプション）

#### Step 2: バックエンドのログ修正
1. `dependencies.py` の2箇所を修正
2. `router.py` のログを確認・修正
3. `service.py` のログを確認・修正

#### Step 3: フロントエンドの修正
1. `deviceIdService.ts` の3箇所を修正
2. `authenticateDevice.ts`（console.log → logger 移行後）
3. `authApiClient.ts` のエラーログ

#### Step 4: 検証
1. ログ出力をキャプチャ
2. `grep -r "device_id.*[0-9a-f]{8}-[0-9a-f]{4}-4"` で平文IDを検索
3. 見つかった場合は修正漏れ

### 考慮事項/ヒント
- SHA256は `hashlib` 標準ライブラリで利用可能
- TypeScriptの `substring()` はインデックス範囲外でもエラーにならない（安全）
- `__DEV__` フラグは Expo が自動的に設定（開発ビルドで `true`）
- Pythonの環境変数 `ENV` は `.env` ファイルで設定済み
