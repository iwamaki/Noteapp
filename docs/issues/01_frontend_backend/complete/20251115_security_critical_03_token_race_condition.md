---
filename: 20251115_security_critical_03_token_race_condition
status: new
priority: high
attempt_count: 0
tags: [security, critical, concurrency, race-condition, database, billing]
date: 2025/11/15
---

## 概要 (Overview)

`BillingService.consume_tokens()`メソッドに**Time-of-Check to Time-of-Use (TOCTOU) 競合状態**が存在します。残高チェックと残高更新の間にデータベースロックがないため、複数の同時リクエストで残高以上のトークンを消費できる致命的な脆弱性があります。

**脆弱性分類:**
- **CWE-362:** Concurrent Execution using Shared Resource with Improper Synchronization 'Race Condition'
- **CVSS Score:** 8.1 (High)
- **影響:** 金銭的損失、会計整合性崩壊、無限トークン消費

## 背景 (Background)

### TOCTOUとは？

**Time-of-Check to Time-of-Use (TOCTOU)** は、以下の2つの操作の間にギャップがあることで発生する競合状態です:

1. **Check (確認):** リソースの状態をチェック
2. **Use (使用):** リソースを使用・更新

この間に他のスレッド/プロセスがリソースを変更すると、チェック時の前提が崩れます。

### 現在のトークン消費フロー

```
Thread A                          Thread B
────────────────────────────────────────────
残高を読み取る (100トークン)
                                  残高を読み取る (100トークン)
60トークン消費可能かチェック → OK
                                  60トークン消費可能かチェック → OK
残高を更新 (100 - 60 = 40)
                                  残高を更新 (40 - 60 = -20) ← 問題！
```

**結果:** 100トークンしかないのに120トークン消費

### 脆弱なコード

```python
# server/src/billing/service.py:230-289
class BillingService:
    def consume_tokens(
        self,
        model_id: str,
        input_tokens: int,
        output_tokens: int
    ) -> Dict:
        # ステップ1: 残高を取得 (ロックなし)
        balance = self.db.query(TokenBalance).filter_by(
            user_id=self.user_id,
            model_id=model_id
        ).first()

        if not balance:
            raise ValueError(f"No token balance found for model {model_id}")

        current_allocated = balance.allocated_tokens or 0
        total_tokens = input_tokens + output_tokens

        # ステップ2: 残高チェック (Time-of-Check)
        if current_allocated < total_tokens:
            raise ValueError(
                f"Insufficient tokens. Required: {total_tokens}, "
                f"Available: {current_allocated}"
            )

        # ★ 問題: ステップ2とステップ3の間にギャップ ★
        # 他のスレッドが同時にステップ2を通過できる

        # ステップ3: 残高更新 (Time-of-Use)
        balance.allocated_tokens = current_allocated - total_tokens
        balance.consumed_tokens = (balance.consumed_tokens or 0) + total_tokens

        # 消費履歴を記録
        consumption_record = TokenConsumption(
            user_id=self.user_id,
            model_id=model_id,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            consumed_at=datetime.now()
        )
        self.db.add(consumption_record)
        self.db.commit()

        return {
            "success": True,
            "consumed": total_tokens,
            "remaining": balance.allocated_tokens
        }
```

## 攻撃シナリオ (Attack Scenarios)

### シナリオ1: LLM API並列リクエスト攻撃

**前提:** ユーザーの残高が100トークン

**攻撃手順:**

1. **攻撃者が同時に2つのリクエストを送信:**
```python
import asyncio
import aiohttp

async def exploit():
    async with aiohttp.ClientSession() as session:
        # 同時に2つのLLMリクエストを送信（それぞれ60トークン消費）
        tasks = [
            session.post('/llm/chat', json={
                'message': 'A' * 1000,  # 60トークン相当
                'model_id': 'gpt-4'
            }),
            session.post('/llm/chat', json={
                'message': 'B' * 1000,  # 60トークン相当
                'model_id': 'gpt-4'
            }),
        ]
        results = await asyncio.gather(*tasks)
        print(f"Both requests succeeded: {results}")

asyncio.run(exploit())
```

2. **サーバー側の処理タイミング:**

```
Time  Thread A (Req 1)              Thread B (Req 2)
────────────────────────────────────────────────────
t0    SELECT allocated_tokens
      FROM token_balance
      WHERE user_id='...'
      → 100

t1                                  SELECT allocated_tokens
                                    FROM token_balance
                                    WHERE user_id='...'
                                    → 100 (同じ値を取得)

t2    Check: 100 >= 60? → YES

t3                                  Check: 100 >= 60? → YES
                                    (まだAが更新していない)

t4    UPDATE token_balance
      SET allocated_tokens = 40
      (100 - 60)

t5                                  UPDATE token_balance
                                    SET allocated_tokens = -20
                                    (40 - 60) ← 問題！

t6    COMMIT

t7                                  COMMIT
```

3. **結果:**
   - 両方のリクエストが成功
   - 100トークンで120トークン消費
   - 最終残高: -20トークン（マイナス残高）

### シナリオ2: 大規模並列攻撃

**前提:** ユーザーの残高が1,000トークン

**攻撃手順:**
1. 100個の並列リクエストを送信（それぞれ50トークン消費）
2. 理論上は1,000トークンで20リクエストのみ成功すべき
3. 競合状態により、100個全て成功
4. **結果:** 1,000トークンで5,000トークン消費

### シナリオ3: 自動スクリプトによる継続的搾取

```python
# exploit_script.py
import asyncio
import aiohttp

async def consume_infinite_tokens():
    """無限にトークンを消費するスクリプト"""
    while True:
        async with aiohttp.ClientSession() as session:
            # 10個の並列リクエスト
            tasks = [
                session.post('/llm/chat', json={'message': 'exploit'})
                for _ in range(10)
            ]
            await asyncio.gather(*tasks, return_exceptions=True)
            await asyncio.sleep(0.1)  # 100ms間隔

# 残高がマイナスになっても止まらない
asyncio.run(consume_infinite_tokens())
```

## 実装方針 (Implementation Strategy)

### 解決策1: ペシミスティックロック (推奨)

**原理:** データ読み取り時にロックを取得し、他のトランザクションがブロックされる

**メリット:**
- 確実に競合を防止
- 実装がシンプル
- SQLAlchemyのビルトイン機能で実装可能

**デメリット:**
- パフォーマンス低下（ロック待ち時間）
- デッドロックのリスク（適切に管理すれば問題なし）

#### 実装コード

```python
# server/src/billing/service.py
from sqlalchemy.orm import Session
from sqlalchemy import select

class BillingService:
    def consume_tokens(
        self,
        model_id: str,
        input_tokens: int,
        output_tokens: int
    ) -> Dict:
        total_tokens = input_tokens + output_tokens

        # ★ ペシミスティックロック: SELECT ... FOR UPDATE ★
        balance = self.db.query(TokenBalance).filter_by(
            user_id=self.user_id,
            model_id=model_id
        ).with_for_update().first()  # ← ここがキーポイント

        # この時点で他のトランザクションは待機状態
        # ロックが解除されるまで同じ行を読み取れない

        if not balance:
            raise ValueError(f"No token balance found for model {model_id}")

        current_allocated = balance.allocated_tokens or 0

        # 残高チェック
        if current_allocated < total_tokens:
            # ロックは自動的に解放される（rollback）
            raise ValueError(
                f"Insufficient tokens. Required: {total_tokens}, "
                f"Available: {current_allocated}"
            )

        # 残高更新（競合状態なし）
        balance.allocated_tokens = current_allocated - total_tokens
        balance.consumed_tokens = (balance.consumed_tokens or 0) + total_tokens

        # 消費履歴を記録
        consumption_record = TokenConsumption(
            user_id=self.user_id,
            model_id=model_id,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            consumed_at=datetime.now()
        )
        self.db.add(consumption_record)

        # コミット時にロックが解放される
        self.db.commit()

        logger.info(
            "Tokens consumed successfully",
            extra={
                "user_id": self.user_id,
                "model_id": model_id,
                "consumed": total_tokens,
                "remaining": balance.allocated_tokens,
            }
        )

        return {
            "success": True,
            "consumed": total_tokens,
            "remaining": balance.allocated_tokens
        }
```

**SQLの動作:**
```sql
-- with_for_update()が生成するSQL
BEGIN;

SELECT * FROM token_balance
WHERE user_id = '...' AND model_id = '...'
FOR UPDATE;  -- ← この行をロック

-- 他のトランザクションは待機
-- ロックが解放されるまでこの行を読み取れない

UPDATE token_balance
SET allocated_tokens = ..., consumed_tokens = ...
WHERE id = ...;

COMMIT;  -- ロック解放
```

### 解決策2: オプティミスティックロック

**原理:** バージョン番号を使用し、更新時にバージョンが変わっていないかチェック

**メリット:**
- 読み取り時にロック不要（パフォーマンス高）
- 並列性が高い

**デメリット:**
- 実装が複雑
- 競合時にリトライ処理が必要

#### 実装コード

```python
# server/src/billing/models.py
from sqlalchemy import Column, Integer

class TokenBalance(Base):
    __tablename__ = "token_balance"

    # ... 既存のカラム ...

    version = Column(Integer, default=0, nullable=False)  # バージョン管理

# server/src/billing/service.py
from sqlalchemy.orm.exc import StaleDataError

class BillingService:
    def consume_tokens_optimistic(
        self,
        model_id: str,
        input_tokens: int,
        output_tokens: int,
        max_retries: int = 3
    ) -> Dict:
        total_tokens = input_tokens + output_tokens

        for attempt in range(max_retries):
            try:
                # ロックなしで読み取り
                balance = self.db.query(TokenBalance).filter_by(
                    user_id=self.user_id,
                    model_id=model_id
                ).first()

                if not balance:
                    raise ValueError(f"No token balance found")

                current_allocated = balance.allocated_tokens or 0
                current_version = balance.version

                # 残高チェック
                if current_allocated < total_tokens:
                    raise ValueError("Insufficient tokens")

                # 更新時にバージョンチェック
                result = self.db.query(TokenBalance).filter(
                    TokenBalance.user_id == self.user_id,
                    TokenBalance.model_id == model_id,
                    TokenBalance.version == current_version  # バージョン一致チェック
                ).update({
                    "allocated_tokens": current_allocated - total_tokens,
                    "consumed_tokens": TokenBalance.consumed_tokens + total_tokens,
                    "version": current_version + 1  # バージョンインクリメント
                }, synchronize_session=False)

                if result == 0:
                    # バージョンが変わっていた → 競合発生
                    self.db.rollback()
                    logger.warning(f"Optimistic lock conflict, retrying (attempt {attempt + 1})")
                    continue  # リトライ

                # 成功
                self.db.commit()
                return {"success": True, "consumed": total_tokens}

            except Exception as e:
                self.db.rollback()
                if attempt == max_retries - 1:
                    raise
                logger.warning(f"Retry {attempt + 1}: {e}")

        raise ValueError("Max retries exceeded")
```

### 解決策3: トランザクション分離レベルの変更

**原理:** データベースのトランザクション分離レベルを上げる

```python
# server/src/billing/database.py
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    isolation_level="SERIALIZABLE",  # 最も厳格な分離レベル
    pool_pre_ping=True,
)
```

**分離レベルの比較:**

| レベル | Dirty Read | Non-repeatable Read | Phantom Read | 競合防止 |
|--------|------------|---------------------|--------------|----------|
| READ UNCOMMITTED | ○ | ○ | ○ | × |
| READ COMMITTED | × | ○ | ○ | × |
| REPEATABLE READ | × | × | ○ | △ |
| SERIALIZABLE | × | × | × | ○ |

**推奨:** `SERIALIZABLE`（完全な競合防止）

### 推奨アプローチ: ペシミスティックロック + SERIALIZABLE

```python
# server/src/billing/database.py
engine = create_engine(
    DATABASE_URL,
    isolation_level="SERIALIZABLE",
    pool_size=10,
    max_overflow=20,
)

# server/src/billing/service.py
def consume_tokens(self, model_id: str, input_tokens: int, output_tokens: int) -> Dict:
    # ペシミスティックロックで確実に防止
    balance = self.db.query(TokenBalance).filter_by(
        user_id=self.user_id,
        model_id=model_id
    ).with_for_update().first()

    # ... 残りの処理 ...
```

## 受け入れ条件 (Acceptance Criteria)

### 機能要件
- [ ] `consume_tokens()`メソッドに`with_for_update()`が適用される
- [ ] トランザクション分離レベルが`SERIALIZABLE`に設定される
- [ ] 同時リクエストで残高以上のトークンを消費できない
- [ ] 競合時にエラーが適切に処理される
- [ ] ロックタイムアウトが設定される（デフォルト30秒）

### セキュリティ要件
- [ ] 並列リクエストで残高がマイナスにならない
- [ ] 100回の同時リクエストでも会計整合性が保たれる
- [ ] デッドロックが発生した場合、適切にロールバックされる

### パフォーマンス要件
- [ ] ロック取得時間が100ms以内（99パーセンタイル）
- [ ] デッドロック発生率が1%以下
- [ ] スループット低下が10%以内

### テスト要件
- [ ] 同時リクエストのストレステスト
- [ ] デッドロック発生時のリトライテスト
- [ ] 残高不足時のエラーハンドリングテスト
- [ ] ロックタイムアウトのテスト

## 関連ファイル (Related Files)

- `server/src/billing/service.py` (L230-289) - `consume_tokens()`メソッド
- `server/src/billing/database.py` - データベース設定
- `server/src/billing/models.py` - `TokenBalance`モデル
- `server/src/llm/routers/chat_router.py` - LLM APIエンドポイント（トークン消費を呼び出す）

## 制約条件 (Constraints)

### 技術的制約
- **データベース:** SQLite / PostgreSQL対応
- **SQLAlchemyバージョン:** 1.4以上
- **トランザクション分離:** SERIALIZABLEサポート必須

### パフォーマンス制約
- **ロックタイムアウト:** 最大30秒
- **デッドロック検出:** 自動検出・ロールバック
- **リトライ:** 最大3回まで

### 運用制約
- **監視:** デッドロック発生率、ロック待ち時間を監視
- **アラート:** デッドロック率が5%超えた場合にアラート

## 開発ログ (Development Log)

---
### 試行 #0 (初回分析)

- **試みたこと:** セキュリティ監査でTOCTOU競合状態を発見
- **結果:** CRITICAL脆弱性として分類、ペシミスティックロック実装計画を作成
- **メモ:** `with_for_update()`の追加が最優先

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- トークン消費に競合状態があることを確認しました
- ペシミスティックロックによる修正方針を策定しました
- まだ実装は開始していません

### 次のアクション
1. **最優先:** `with_for_update()`の追加
   - `server/src/billing/service.py`の`consume_tokens()`を修正
   - トランザクション分離レベルを`SERIALIZABLE`に設定

2. **テスト:** 並列リクエストのストレステスト実施
   - `locust`または`pytest-xdist`で並列テスト
   - 100同時リクエストでも整合性が保たれることを確認

3. **モニタリング:** デッドロック検出のロギング追加

### 考慮事項/ヒント
- `with_for_update()`は`SELECT ... FOR UPDATE`を生成します
- デッドロックのリスクがあるため、ロック順序を統一すること
- PostgreSQLでは`SELECT ... FOR UPDATE NOWAIT`も検討可能
- SQLiteは`SERIALIZABLE`が`BEGIN IMMEDIATE`に相当

### 参考資料
- [SQLAlchemy: SELECT ... FOR UPDATE](https://docs.sqlalchemy.org/en/14/orm/query.html#sqlalchemy.orm.Query.with_for_update)
- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [Race Conditions - OWASP](https://owasp.org/www-community/vulnerabilities/Race_Conditions)
