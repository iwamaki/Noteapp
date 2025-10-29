---
filename:  001_default_file_view_setting
id: 1 # Assuming this is the next available ID
status: new
priority: medium
attempt_count: 0
tags: [UI, settings, navigation]
---

## 概要 (Overview)

ファイルリストからファイルを開く際に、デフォルトで編集画面に遷移するか、プレビュー画面に遷移するかをユーザーが設定できるようにする機能を追加します。

## 背景 (Background)

現在の挙動では、ファイルを開くと常に編集画面に遷移します。ユーザーによってはコンテンツの確認を主目的とする場合もあり、その際に直接プレビュー画面に遷移できる選択肢を提供することで、利便性を向上させます。

## 実装方針 (Implementation Strategy)

1.  **設定の追加:**
    *   `settingsStore.ts`に`defaultFileViewScreen`という新しい設定項目を追加します。この設定は`'edit'`または`'preview'`の値を持ち、初期値は`'edit'`とします。
    *   `AppSettings`インターフェースも更新します。
2.  **設定UIの追加:**
    *   `SettingsScreen.tsx`に上記設定を変更するためのUIコンポーネント（ピッカー）を追加します。既存の表示設定セクションに配置します。
3.  **ナビゲーションロジックの変更:**
    *   `FileListScreen.tsx`において、ユーザーがファイルを選択した際のナビゲーションロジックを変更します。
    *   `settingsStore`から`defaultFileViewScreen`の値を読み込み、その値に基づいて`FileEditScreen`への遷移時に初期表示モードを決定し、パラメータとして渡します。
4.  **`FileEditScreen`の対応:**
    *   `FileEditScreen`が、ナビゲーションパラメータとして受け取った初期表示モード（`'edit'`または`'preview'`）を使用して、コンポーネントの初期`viewMode`を設定するように改修します。

## 受け入れ条件 (Acceptance Criteria)

- [ ] 設定画面に「デフォルトファイル表示」の設定項目が追加されていること。
- [ ] 「デフォルトファイル表示」設定で「編集画面」と「プレビュー」を選択できること。
- [ ] 設定は永続化され、アプリを再起動しても保持されること。
- [ ] ファイルリストからファイルをタップした際に、選択された「デフォルトファイル表示」設定に従って、編集画面またはプレビューモードで開かれること。
- [ ] `FileEditScreen`は、`defaultEditorMode`（エディタ内のモード）とは独立して、初期表示モードを受け入れて正しく適用すること。

## 関連ファイル (Related Files)

- `app/settings/settingsStore.ts`
- `app/settings/SettingsScreen.tsx`
- `app/screen/file-list/FileListScreen.tsx`
- `app/screen/file-edit/FileEditScreen.tsx`
- `app/navigation/types.ts` (ナビゲーションパラメータの型定義に必要となる可能性あり)

## 制約条件 (Constraints)

- 既存の`defaultEditorMode`機能は維持し、今回の変更によって影響を受けないこと。
- `FileEditScreen`内でプレビュー機能が既に存在することを利用し、新たなプレビュー専用画面は作成しないこと。
- ユーザー体験を損なわないよう、設定変更は即座に反映されること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** デフォルトファイル表示設定の追加に関する計画策定。`FileListScreen.tsx`と`FileEditScreen.tsx`の調査。
- **結果:** `FileEditScreen`が初期表示モードをサポートしていることを確認。専用のプレビュー画面は不要と判断。
- **メモ:** `FileEditScreen`への初期モードの渡し方や、`RootStackParamList`への型定義の追加が必要。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** 「デフォルトファイル表示」設定の実装計画が策定され、関連ファイル（`settingsStore.ts`, `SettingsScreen.tsx`, `FileListScreen.tsx`, `FileEditScreen.tsx`）の事前調査が完了しました。`FileEditScreen`は初期プレビューモードをサポートしていることが確認済みです。
- **次のアクション:** 策定された計画に従い、`app/settings/settingsStore.ts`の変更から開始してください。具体的には、`AppSettings`インターフェースと`defaultSettings`オブジェクトに`defaultFileViewScreen`設定を追加します。
- **考慮事項/ヒント:** `app/navigation/types.ts`も更新が必要になる可能性が高いです。
