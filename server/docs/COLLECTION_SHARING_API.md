# コレクション共有 API ドキュメント

## 概要

知識ベース（RAG）のpersistentコレクションを他のユーザーと共有する機能です。
共有されたユーザーは、コレクション内のドキュメントを検索・閲覧できます（読み取り専用）。

### 主な特徴

- **共有単位**: コレクション単位
- **権限**: 読み取りのみ（検索・閲覧）
- **共有方法**: メールアドレスで指定
- **制限**: 一時コレクション（temp）は共有不可

---

## エンドポイント一覧

| メソッド | パス | 説明 |
|----------|------|------|
| POST | `/api/knowledge-base/collections/{name}/share` | コレクションを共有 |
| DELETE | `/api/knowledge-base/collections/{name}/share/{user_id}` | 共有を解除 |
| GET | `/api/knowledge-base/collections/{name}/shares` | 共有一覧を取得 |
| GET | `/api/knowledge-base/shared-with-me` | 自分に共有されたコレクション一覧 |

---

## 認証

全てのエンドポイントでJWT認証が必要です。

```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. コレクションを共有

### `POST /api/knowledge-base/collections/{name}/share`

コレクションを指定したメールアドレスのユーザーと共有します。

#### パスパラメータ

| 名前 | 型 | 説明 |
|------|------|------|
| name | string | コレクション名 |

#### リクエストボディ

```json
{
  "target_email": "user@example.com"
}
```

| フィールド | 型 | 必須 | 説明 |
|------------|------|------|------|
| target_email | string (email) | Yes | 共有先ユーザーのメールアドレス |

#### レスポンス（成功: 200）

```json
{
  "success": true,
  "message": "コレクション 'my_collection' を共有しました",
  "share": {
    "collection_name": "my_collection",
    "shared_with_user_id": "user_abc123",
    "shared_with_email": "user@example.com",
    "shared_with_display_name": "John Doe"
  }
}
```

#### エラーレスポンス

| HTTPコード | detail | 説明 |
|------------|--------|------|
| 400 | 一時コレクションは共有できません | tempコレクションへの共有試行 |
| 400 | 自分自身には共有できません | 自己共有の試行 |
| 403 | コレクションの所有者のみ共有設定できます | 非所有者による共有試行 |
| 404 | コレクション '{name}' が見つかりません | コレクションが存在しない |
| 404 | ユーザー '{email}' が見つかりません | メールアドレスに該当するユーザーがいない |
| 409 | 既に共有済みです | 同じユーザーへの重複共有 |

---

## 2. 共有を解除

### `DELETE /api/knowledge-base/collections/{name}/share/{user_id}`

指定したユーザーとの共有を解除します。

#### パスパラメータ

| 名前 | 型 | 説明 |
|------|------|------|
| name | string | コレクション名 |
| user_id | string | 共有解除するユーザーのID |

#### レスポンス（成功: 200）

```json
{
  "success": true,
  "message": "コレクション 'my_collection' の共有を解除しました"
}
```

#### エラーレスポンス

| HTTPコード | detail | 説明 |
|------------|--------|------|
| 403 | コレクションの所有者のみ共有解除できます | 非所有者による解除試行 |
| 404 | 共有設定が見つかりません | 該当する共有が存在しない |

---

## 3. 共有一覧を取得

### `GET /api/knowledge-base/collections/{name}/shares`

コレクションの共有先ユーザー一覧を取得します（所有者のみ）。

#### パスパラメータ

| 名前 | 型 | 説明 |
|------|------|------|
| name | string | コレクション名 |

#### レスポンス（成功: 200）

```json
{
  "success": true,
  "collection_name": "my_collection",
  "owner_user_id": "user_owner123",
  "shares": [
    {
      "shared_with_user_id": "user_abc123",
      "shared_with_email": "user1@example.com",
      "shared_with_display_name": "John Doe",
      "created_at": "2025-11-26T12:00:00+00:00"
    },
    {
      "shared_with_user_id": "user_def456",
      "shared_with_email": "user2@example.com",
      "shared_with_display_name": "Jane Smith",
      "created_at": "2025-11-26T13:00:00+00:00"
    }
  ],
  "count": 2
}
```

#### エラーレスポンス

| HTTPコード | detail | 説明 |
|------------|--------|------|
| 403 | コレクションの所有者のみ共有一覧を確認できます | 非所有者によるアクセス |
| 404 | コレクション '{name}' が見つかりません | コレクションが存在しない |

---

## 4. 自分に共有されたコレクション一覧

### `GET /api/knowledge-base/shared-with-me`

自分に共有されているコレクションの一覧を取得します。

#### レスポンス（成功: 200）

```json
{
  "success": true,
  "collections": [
    {
      "collection_name": "shared_docs",
      "owner_user_id": "user_owner123",
      "owner_email": "owner@example.com",
      "owner_display_name": "Owner Name",
      "document_count": 15,
      "shared_at": "2025-11-26T12:00:00+00:00"
    }
  ],
  "count": 1
}
```

---

## フロントエンド実装例

### TypeScript 型定義

```typescript
// リクエスト
interface ShareCollectionRequest {
  target_email: string;
}

// レスポンス
interface ShareCollectionResponse {
  success: boolean;
  message: string;
  share: {
    collection_name: string;
    shared_with_user_id: string;
    shared_with_email: string;
    shared_with_display_name: string;
  };
}

interface ShareInfo {
  shared_with_user_id: string;
  shared_with_email: string;
  shared_with_display_name: string;
  created_at: string;
}

interface GetSharesResponse {
  success: boolean;
  collection_name: string;
  owner_user_id: string;
  shares: ShareInfo[];
  count: number;
}

interface SharedCollection {
  collection_name: string;
  owner_user_id: string;
  owner_email: string;
  owner_display_name: string;
  document_count: number;
  shared_at: string;
}

interface SharedWithMeResponse {
  success: boolean;
  collections: SharedCollection[];
  count: number;
}
```

### API呼び出し例（fetch）

```typescript
const API_BASE = 'http://localhost:8000';

// コレクションを共有
async function shareCollection(
  collectionName: string,
  targetEmail: string,
  token: string
): Promise<ShareCollectionResponse> {
  const response = await fetch(
    `${API_BASE}/api/knowledge-base/collections/${collectionName}/share`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_email: targetEmail }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  return response.json();
}

// 共有解除
async function unshareCollection(
  collectionName: string,
  userId: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/knowledge-base/collections/${collectionName}/share/${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }
}

// 共有一覧取得
async function getShares(
  collectionName: string,
  token: string
): Promise<GetSharesResponse> {
  const response = await fetch(
    `${API_BASE}/api/knowledge-base/collections/${collectionName}/shares`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  return response.json();
}

// 自分に共有されたコレクション一覧
async function getSharedWithMe(token: string): Promise<SharedWithMeResponse> {
  const response = await fetch(
    `${API_BASE}/api/knowledge-base/shared-with-me`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  return response.json();
}
```

---

## UI実装のヒント

### 共有ダイアログ

1. メールアドレス入力フィールド（バリデーション: email形式）
2. 共有ボタン
3. エラーメッセージ表示エリア
   - 「ユーザーが見つかりません」
   - 「既に共有済みです」
   - 「自分自身には共有できません」

### 共有管理画面

1. 共有先ユーザー一覧（アバター、名前、メール、共有日時）
2. 各ユーザーに「共有解除」ボタン
3. 「新しいユーザーを追加」ボタン → 共有ダイアログ表示

### 共有されたコレクション画面

1. カード形式でコレクション表示
2. 各カードに：所有者名、ドキュメント数、共有日時
3. クリックで検索画面へ遷移

### アクセス権限の表示

コレクション一覧で以下を区別して表示：
- 自分のコレクション（編集・削除・共有可能）
- 共有されたコレクション（検索・閲覧のみ）

---

## 注意事項

1. **一時コレクション（temp）は共有不可**: TTLで自動削除されるため
2. **共有は読み取り専用**: 共有先ユーザーはドキュメントの追加・削除不可
3. **メールアドレスはシステムに登録済みのユーザーのみ**: 未登録ユーザーへの共有不可
4. **共有解除後**: 共有先ユーザーは即座にアクセス不可になる
