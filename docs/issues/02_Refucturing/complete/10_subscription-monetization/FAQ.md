# FAQ & トラブルシューティング

サブスクリプション機能実装に関するよくある質問とトラブルシューティング。

---

## 一般的な質問

### Q1. なぜ3段階（Phase）に分けるのか？

**A**: 早期リリースとセキュリティのバランスを取るためです。

- **Phase 1 (3週)**: 最速でリリース・収益化開始
- **Phase 2 (4週)**: ユーザー体験向上（複数デバイス対応）
- **Phase 3 (2週)**: セキュリティ完全化

一度にすべてを実装すると9週間かかりますが、段階的に進めることで3週間後には収益化を開始できます。

---

### Q2. Phase 1で不正利用されないか？

**A**: リスクはありますが、限定的です。

**リスク**:
- クライアント側のみの制限なので、技術的には回避可能

**軽減策**:
- 明らかに異常な使用パターン（1日に1000回リクエストなど）は手動で対応
- Phase 2（4週後）でサーバー側の検証を追加
- Phase 3（9週後）で完全なセキュリティ実装

**現実的な見方**:
- 多くのユーザーは不正利用しない
- 不正利用する技術力があるユーザーは少数
- 早期収益化のメリットが大きい

---

### Q3. 既存ユーザーはどうなる？

**A**: 既存機能は無料で継続利用できます。

**マイグレーション戦略**:
1. **Phase 1リリース時**:
   - 既存機能（RAG、Web検索除く）は無料プランで利用可能
   - 既存ユーザーに30日のProトライアルを提供（オプション）

2. **Phase 2リリース時**:
   - ローカルデータを自動的にクラウドに移行
   - アカウント作成を促すが、強制しない

3. **移行期間**:
   - 最初の3ヶ月は既存ユーザーに優遇措置
   - 例: "既存ユーザー特典: Pro初月50%オフ"

---

### Q4. 価格設定は適切か？

**A**: 日本市場での類似アプリを参考にした価格です。

**比較**:
- Notion: ¥1,000/月
- Evernote Premium: ¥680/月
- Bear Pro: ¥150/月

**Noteapp Pro (¥980/月)** は中間の価格帯で、LLM機能を含むことを考えると妥当です。

**調整の余地**:
- Phase 1リリース後、ユーザーフィードバックを見て調整
- 年間プラン導入（例: ¥9,800/年 = 約2ヶ月分お得）

---

### Q5. LLM APIのコストは大丈夫？

**A**: プランごとの制限でコントロールできます。

**コスト試算** (Gemini API):
- Flash: $0.00001875/1K chars (入力)
- Pro: $0.000125/1K chars

**1リクエストあたりの平均コスト**:
- 入力: 1000文字、出力: 500文字
- Flash: 約¥0.003/リクエスト
- Pro: 約¥0.02/リクエスト

**月間コスト** (100人のProユーザーが1000回/月使用):
- 100人 × 1000回 × ¥0.003 = ¥300
- 収益: 100人 × ¥980 = ¥98,000
- **利益率**: 99.7%

LLM APIのコストは非常に低いため、余裕があります。

---

## 実装に関する質問

### Q6. react-native-iap のセットアップが難しい

**A**: 公式ドキュメントに従えば問題ありません。

**手順**:
1. インストール: `npm install react-native-iap`
2. iOS: `cd ios && pod install`
3. Android: `android/app/build.gradle` に設定追加

**よくある問題**:
- **iOS**: Bundle IDが正しく設定されているか確認
- **Android**: `com.android.billingclient` のバージョン確認

**参考**:
- [react-native-iap 公式ドキュメント](https://react-native-iap.dooboolab.com/)
- サンプルコード: Phase 1実装時に提供

---

### Q7. Firebase と Supabase 両方使うのは複雑では？

**A**: それぞれの得意分野を活かすためです。

**Firebase**: 認証に特化
- OAuth（Google, Apple）が簡単
- React Nativeとの統合が成熟

**Supabase**: データベース・ストレージ
- PostgreSQLの強力さ
- RLS（Row Level Security）
- コスト効率

**代替案**:
- すべてFirebaseで統一することも可能
- ただし、Firestoreはクエリ制限があり、コストが高い
- すべてSupabaseで統一することも可能
- ただし、React Native Authサポートがやや弱い

**推奨**: 現在の設計（Firebase Auth + Supabase DB）

---

### Q8. データベース設計は変更される可能性がある？

**A**: はい、実装中に調整される可能性があります。

**現在の設計は「初期案」**:
- 実装を進める中で、必要に応じて調整
- マイグレーションスクリプトで対応

**柔軟性を保つために**:
- データベーススキーマはバージョン管理
- Supabaseのマイグレーション機能を活用

---

## トラブルシューティング

### T1. IAP購入がテストできない

**問題**: Sandbox環境で購入テストが失敗する

**解決策**:
1. **iOS**:
   - Sandbox テストアカウントを作成（App Store Connect）
   - 設定 > App Store > Sandbox Account でサインイン
   - プロダクトIDが正しいか確認

2. **Android**:
   - Google Play Console でテスターを追加
   - Internal Testing トラックを使用
   - ライセンステスターとして登録

**デバッグ**:
```typescript
// react-native-iap のログを有効化
import RNIap, { requestPurchase, purchaseUpdatedListener } from 'react-native-iap';

// リスナーを設定してエラーを確認
purchaseUpdatedListener((purchase) => {
  console.log('Purchase:', purchase);
});
```

---

### T2. Firebase Authentication がうまく動かない

**問題**: ログインできない、トークンが取得できない

**解決策**:
1. **Firebase Console で確認**:
   - Authentication が有効になっているか
   - OAuth プロバイダーが正しく設定されているか
   - iOS/Android アプリが登録されているか

2. **設定ファイルを確認**:
   - iOS: `GoogleService-Info.plist` が正しい場所にあるか
   - Android: `google-services.json` が正しい場所にあるか

3. **Bundle ID / Package Name を確認**:
   - Firebase Consoleの設定と一致しているか

**デバッグ**:
```typescript
import auth from '@react-native-firebase/auth';

auth().onAuthStateChanged((user) => {
  console.log('Auth state changed:', user);
});
```

---

### T3. Supabase の RLS でアクセスできない

**問題**: データが取得できない、エラーが発生する

**原因**: Row Level Security (RLS) のポリシーが正しく設定されていない

**解決策**:
1. **ポリシーを確認**:
```sql
-- Supabase SQL Editorで確認
SELECT * FROM pg_policies WHERE tablename = 'files';
```

2. **一時的にRLSを無効化してテスト**:
```sql
ALTER TABLE files DISABLE ROW LEVEL SECURITY;
```

3. **正しいポリシーを設定**:
```sql
CREATE POLICY "Users can access their own files"
  ON files FOR ALL
  USING (auth.uid()::text = user_id);
```

**デバッグ**:
```typescript
const { data, error } = await supabase
  .from('files')
  .select('*');

console.log('Data:', data);
console.log('Error:', error);  // エラーメッセージを確認
```

---

### T4. サーバー側の認証が動かない

**問題**: FastAPIで認証ミドルウェアがエラーを返す

**解決策**:
1. **Firebase Admin SDK を確認**:
```python
import firebase_admin
from firebase_admin import credentials, auth

cred = credentials.Certificate('/path/to/firebase-admin-sdk.json')
firebase_admin.initialize_app(cred)

# トークン検証
try:
    decoded_token = auth.verify_id_token(id_token)
    uid = decoded_token['uid']
except Exception as e:
    print(f"Token verification failed: {e}")
```

2. **トークンが正しく送信されているか確認**:
```typescript
// クライアント側
const token = await auth().currentUser?.getIdToken();
console.log('Token:', token);

// ヘッダーに含める
axios.post('/api/chat', data, {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

### T5. 使用量カウンターがリセットされない

**問題**: 月次リセットが動作しない

**解決策**:
1. **バックグラウンドタスクを確認**:
```typescript
// React Native Background Fetch または
// Expo Task Manager を使用

import BackgroundFetch from 'react-native-background-fetch';

BackgroundFetch.configure({
  minimumFetchInterval: 15, // 15分ごと
}, async (taskId) => {
  // 月次リセットチェック
  const now = new Date();
  if (now.getDate() === 1) {  // 毎月1日
    await resetMonthlyUsage();
  }
  BackgroundFetch.finish(taskId);
});
```

2. **サーバー側でもリセット**:
```python
# Cron jobまたはCloud Schedulerで毎月1日に実行
@app.post("/api/usage/reset-monthly")
async def reset_monthly_usage():
    # すべてのユーザーの使用量をリセット
    pass
```

---

### T6. ビルドに時間がかかる

**問題**: `npm run ios` や `npm run android` が遅い

**解決策**:
1. **キャッシュをクリア**:
```bash
# React Native
npx react-native start --reset-cache

# Metro bundler
rm -rf $TMPDIR/metro-*
rm -rf $TMPDIR/haste-*

# iOS
cd ios && rm -rf Pods && pod install

# Android
cd android && ./gradlew clean
```

2. **Watchman をリセット**:
```bash
watchman watch-del-all
```

---

## パフォーマンス最適化

### P1. アプリの起動が遅い

**原因**: 初期化タスクが多い

**解決策**:
1. **遅延初期化**:
```typescript
// 必要なときだけ初期化
const initializeIAP = async () => {
  if (!iapInitialized) {
    await RNIap.initConnection();
    iapInitialized = true;
  }
};
```

2. **バックグラウンドで初期化**:
```typescript
// App.tsx
useEffect(() => {
  // UIブロックしない
  setTimeout(() => {
    initializeServices();
  }, 1000);
}, []);
```

---

### P2. 同期が遅い

**原因**: 大量のファイルを一度に同期

**解決策**:
1. **バッチ処理**:
```typescript
// 10ファイルずつ同期
const batchSize = 10;
for (let i = 0; i < files.length; i += batchSize) {
  const batch = files.slice(i, i + batchSize);
  await syncBatch(batch);
}
```

2. **差分同期**:
```typescript
// 変更されたファイルのみ
const changedFiles = files.filter(f =>
  f.updatedAt > lastSyncTime
);
```

---

## よくあるエラーメッセージ

### E1. "Product not found"
- App Store / Play Console でプロダクトが承認されていない
- プロダクトIDが間違っている
- Sandbox/Testingモードが有効になっていない

### E2. "Invalid token"
- Firebase tokenが期限切れ → `getIdToken(true)` で強制更新
- tokenがヘッダーに正しく含まれていない
- サーバー側のFirebase Admin SDK設定が間違っている

### E3. "Row Level Security policy violation"
- RLSポリシーが正しく設定されていない
- `auth.uid()` と `user_id` の型が一致していない
- ログインしていない状態でアクセスしている

### E4. "Subscription limit exceeded"
- 使用量が上限に達している（正常な動作）
- アップグレードを促す

---

## サポートリソース

### 公式ドキュメント
- [react-native-iap](https://react-native-iap.dooboolab.com/)
- [Firebase Auth](https://firebase.google.com/docs/auth)
- [Supabase](https://supabase.com/docs)
- [FastAPI](https://fastapi.tiangolo.com/)

### コミュニティ
- Stack Overflow: `react-native-iap`, `firebase`, `supabase` タグ
- Discord: React Native Community
- GitHub Issues: 各ライブラリのリポジトリ

---

**最終更新**: 2025-11-06
