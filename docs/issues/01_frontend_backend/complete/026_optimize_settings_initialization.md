---
filename: 026_optimize_settings_initialization
id: 26
status: new
priority: B:medium
attempt_count: 0
tags: [performance, SettingsScreen, async-loading, optimization]
---

## 概要 (Overview)

設定画面への遷移時に発生する「一瞬だけちゃんとレンダリングされていない瞬間」を解消するため、LLMプロバイダーの非同期読み込みを最適化し、画面表示の高速化を実現する。

## 背景 (Background)

現在、SettingsScreenへの画面遷移時、以下の処理フローにより初期表示に時間がかかっている：

**現状の問題** (`app/settings/SettingsScreen.tsx:33-48`):

```tsx
function SettingsScreen() {
  const [llmProviders, setLlmProviders] = useState<Record<string, LLMProvider>>({});
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);

  useEffect(() => {
    loadSettings();
    loadLLMProviders(); // 画面遷移後に実行される
  }, []);

  const loadLLMProviders = async () => {
    try {
      setIsLoadingProviders(true); // ローディング状態に
      const providers = await APIService.loadLLMProviders(); // 時間がかかる
      setLlmProviders(providers);
    } catch (error) {
      console.error('Failed to load LLM providers:', error);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  // ...

  return (
    <ScrollView>
      {isLoadingProviders ? (
        <ActivityIndicator /> // ローディング中はこれが表示される
      ) : (
        <LLMSettings /> // プロバイダー読み込み完了後に表示
      )}
    </ScrollView>
  );
}
```

この実装により、以下の問題が発生：
1. 画面遷移してから`loadLLMProviders()`が実行されるため、遅延が体感される
2. ローディング中は`ActivityIndicator`が表示され、「ちゃんとレンダリングされていない瞬間」が発生
3. ユーザーが設定画面を開くたびに毎回APIから読み込みが発生する（キャッシュなし）

## 実装方針 (Implementation Strategy)

### 解決策1: LLMプロバイダーのプリロード（推奨）

アプリ起動時またはFileList画面でLLMプロバイダーをバックグラウンドで事前読み込みする。

**APIServiceにキャッシュ機能を追加**:

```tsx
// app/features/chat/llmService/api.ts
class APIService {
  private cachedProviders: Record<string, LLMProvider> | null = null;
  private loadingPromise: Promise<Record<string, LLMProvider>> | null = null;

  /**
   * LLMプロバイダーを読み込み、キャッシュする
   * 複数回呼ばれても、最初の1回のみ実行される
   */
  async loadLLMProviders(): Promise<Record<string, LLMProvider>> {
    // 既にキャッシュがあれば返す
    if (this.cachedProviders) {
      return this.cachedProviders;
    }

    // 既にロード中なら同じPromiseを返す（重複リクエスト防止）
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // ロード開始
    this.loadingPromise = this._fetchLLMProviders();
    this.cachedProviders = await this.loadingPromise;
    this.loadingPromise = null;

    return this.cachedProviders;
  }

  /**
   * キャッシュをクリアして再読み込みを強制
   */
  refreshLLMProviders(): void {
    this.cachedProviders = null;
  }

  /**
   * 同期的にキャッシュを取得（キャッシュがない場合はnull）
   */
  getCachedLLMProviders(): Record<string, LLMProvider> | null {
    return this.cachedProviders;
  }

  private async _fetchLLMProviders(): Promise<Record<string, LLMProvider>> {
    // 実際のAPI呼び出し
    // ...
  }
}
```

**App.tsxまたはFileListScreenでプリロード**:

```tsx
// app/App.tsx または app/screen/file-list/FileListScreen.tsx
useEffect(() => {
  // バックグラウンドでプリロード（非同期、ブロックしない）
  APIService.loadLLMProviders().catch(console.error);
}, []);
```

**SettingsScreenで即座に表示**:

```tsx
// app/settings/SettingsScreen.tsx
function SettingsScreen() {
  const [llmProviders, setLlmProviders] = useState<Record<string, LLMProvider>>(
    () => APIService.getCachedLLMProviders() || {} // 初期値にキャッシュを使用
  );
  const [isLoadingProviders, setIsLoadingProviders] = useState(
    () => !APIService.getCachedLLMProviders() // キャッシュがなければローディング
  );

  useEffect(() => {
    loadSettings();

    // キャッシュがあればすぐ表示、なければ読み込み
    const cached = APIService.getCachedLLMProviders();
    if (cached) {
      setLlmProviders(cached);
      setIsLoadingProviders(false);
    } else {
      loadLLMProviders();
    }
  }, []);

  const loadLLMProviders = async () => {
    try {
      const providers = await APIService.loadLLMProviders();
      setLlmProviders(providers);
    } catch (error) {
      console.error('Failed to load LLM providers:', error);
    } finally {
      setIsLoadingProviders(false);
    }
  };

  // ...
}
```

### 解決策2: ローディング表示の改善（補助的）

ローディング中も基本的なUIを表示し、LLM設定部分のみスケルトンローディングを表示：

```tsx
return (
  <ScrollView style={styles.container}>
    <View style={styles.content}>
      {/* 表示設定は常に表示 */}
      {renderSection('表示設定')}
      {renderPicker(/* テーマ設定 */)}
      {renderPicker(/* フォントサイズ */)}
      {renderPicker(/* デフォルトファイル表示 */)}

      {/* LLM設定のみローディング表示 */}
      {renderSection('LLM設定')}
      {isLoadingProviders ? (
        <SkeletonLoader /> // スケルトンUI
      ) : (
        <>
          {renderPicker(/* LLMプロバイダー */)}
          {renderPicker(/* モデル */)}
        </>
      )}
    </View>
  </ScrollView>
);
```

## 受け入れ条件 (Acceptance Criteria)

- [ ] `APIService`にLLMプロバイダーのキャッシュ機能が実装されている
- [ ] `APIService.loadLLMProviders()`が重複呼び出しに対応している（同じPromiseを返す）
- [ ] `APIService.getCachedLLMProviders()`で同期的にキャッシュを取得できる
- [ ] アプリ起動時またはFileList画面でLLMプロバイダーがプリロードされている
- [ ] SettingsScreen初回表示時、キャッシュがあれば即座に表示される
- [ ] SettingsScreen表示中にActivityIndicatorが表示されない（キャッシュがある場合）
- [ ] キャッシュがない場合でも、表示設定は即座に表示される
- [ ] LLMプロバイダー読み込み失敗時にエラーが適切に処理される
- [ ] 設定画面への遷移が体感的にスムーズになっている

## 関連ファイル (Related Files)

### 主要対象ファイル
- `app/settings/SettingsScreen.tsx` (33-48行目)
- `app/features/chat/llmService/api.ts` - APIServiceクラス

### プリロード実装先
- `app/App.tsx` - アプリ起動時にプリロード（推奨）
- または `app/screen/file-list/FileListScreen.tsx` - FileList表示時にプリロード

### 関連ファイル
- `app/features/chat/llmService/types/types.ts` - LLMProvider型定義
- `app/settings/settingsStore.ts` - 設定ストア

## 制約条件 (Constraints)

- LLMプロバイダーの情報が古くならないよう、適切なキャッシュ戦略を実装すること
- ネットワークエラー時でも、キャッシュがあれば設定画面を表示できること
- APIService.loadLLMProvidersの既存の呼び出し元に影響を与えないこと（後方互換性）
- メモリリークを避けるため、キャッシュのライフサイクルを適切に管理すること
- プリロードがアプリ起動時のパフォーマンスに悪影響を与えないこと（非同期で実行）

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （未着手）
- **結果:** （未着手）
- **メモ:** （未着手）

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** Issue作成完了。実装未着手。
  - **次のアクション:**
  1. LLMプロバイダーのプリロードは、`app/initialization/tasks` 内に新しいタスクとして実装することを検討する。これにより、初期化ロジックの分離と管理が容易になる。
  2. `app/features/chat/llmService/api.ts`を開き、キャッシュ機能を実装する     - `cachedProviders`プライベート変数
     - `loadingPromise`プライベート変数
     - `getCachedLLMProviders()`メソッド
     - `refreshLLMProviders()`メソッド
     - 既存の`loadLLMProviders()`にキャッシュロジックを追加
  2. `app/App.tsx`の`AppContent`コンポーネント内でプリロードを実装する
  3. `app/settings/SettingsScreen.tsx`を修正し、キャッシュを利用する
  4. 設定画面を開いて、即座に表示されることを確認する
- **考慮事項/ヒント:**
  - APIServiceはシングルトンなので、クラス内に状態を持っても問題ない
  - プリロードはアプリ起動時の`useEffect`で実行し、`.catch(console.error)`でエラーを握りつぶす（失敗しても続行）
  - キャッシュのリフレッシュは、将来的に「設定」→「キャッシュをクリア」ボタンなどで実装できる
  - React Suspenseは使用しない（React Nativeでの対応が不完全なため）
