---
filename:  001_replace_delete_alert_with_custom_modal
id: 001
status: new
priority: medium
attempt_count: 0
tags: [UI, modal, alert, refactor]
---

## 概要 (Overview)

ファイルリスト画面において、アイテムの長押し選択時に表示されるヘッダーボタンのうち、「移動」および「コピー」機能の成功・失敗時に表示される`Alert.alert`を削除します。また、「削除」機能の確認モーダルを、既存の`CustomModal`コンポーネントに置き換えます。

## 背景 (Background)

現在のファイルリスト画面では、アイテムの長押し選択後に表示されるヘッダーアクション（移動、コピー、削除など）の実行結果が`Alert.alert`でユーザーに通知されています。これらの`Alert.alert`は、アプリのUI/UXに合わせた専用のモーダルに置き換えるか、または不要な場合は削除することが求められています。特に「削除」機能については、誤操作防止のため、アプリ専用の確認モーダルを導入し、一貫性のあるユーザー体験を提供する必要があります。

## 実装方針 (Implementation Strategy)

1.  **`Alert.alert`の削除:**
    *   `app/screen/file-list/FileListScreen.tsx`内の`handleSelectItem`、`handleCopySelected`、`renderTreeItem`関数から、移動およびコピー操作に関連する`Alert.alert`の呼び出しを削除します。
2.  **「削除」モーダルの`CustomModal`への置き換え:**
    *   `app/screen/file-list/FileListScreen.tsx`に`CustomModal`コンポーネントをインポートします。
    *   `handleDeleteSelected`関数内で`Alert.alert`を使用している箇所を、`CustomModal`を表示するロジックに置き換えます。
    *   `FileListScreenContent`コンポーネント内で`CustomModal`をレンダリングし、削除確認のメッセージ、キャンセルボタン、実行ボタンを設定します。
    *   `CustomModal`の表示/非表示を制御するための状態（例: `showDeleteConfirmModal`）を`FileListScreenContent`に追加します。

## 受け入れ条件 (Acceptance Criteria)

- [ ] ファイルリスト画面でアイテムを長押し選択後、「移動」または「コピー」を実行しても、成功・失敗の`Alert.alert`が表示されないこと。
- [ ] ファイルリスト画面でアイテムを長押し選択後、「削除」ボタンを押すと、`Alert.alert`ではなくアプリ専用の`CustomModal`が表示されること。
- [ ] `CustomModal`には、削除対象のアイテムに関する適切な確認メッセージが表示されること。
- [ ] `CustomModal`には、「キャンセル」ボタンと「削除」実行ボタンが表示され、それぞれが正しく機能すること。
- [ ] 「削除」実行ボタンを押すと、選択されたアイテムが削除され、モーダルが閉じること。
- [ ] 「キャンセル」ボタンを押すと、モーダルが閉じ、アイテムは削除されないこと。

## 関連ファイル (Related Files)

- `app/screen/file-list/FileListScreen.tsx`
- `app/screen/file-list/hooks/useFileListHeader.tsx`
- `app/components/CustomModal.tsx`

## 制約条件 (Constraints)

- 既存の`CustomModal`コンポーネントを再利用すること。
- 新しいUIコンポーネントは作成しないこと。
- 削除以外の操作（リネーム、作成）に関する`Alert.alert`やモーダルについては、今回のタスクの範囲外とする。

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `FileListScreen.tsx`への変更はすべて`git restore`で元に戻されています。
- **次のアクション:**
    1.  `app/screen/file-list/FileListScreen.tsx`から、移動およびコピー操作に関連する`Alert.alert`の呼び出しを削除します。
    2.  `app/screen/file-list/FileListScreen.tsx`に`CustomModal`をインポートし、削除確認のために使用するロジックを実装します。
- **考慮事項/ヒント:**
    *   `CustomModal`のインポートパスは`../../components/CustomModal`となるはずです。
    *   `handleDeleteSelected`関数を修正し、`Alert.alert`の代わりに`CustomModal`の表示をトリガーするようにします。
    *   `CustomModal`の表示状態を管理するための`useState`フックを導入する必要があります。
    *   `CustomModal`の`onConfirm`プロパティで実際の削除ロジックを呼び出し、`onCancel`プロパティでモーダルを閉じるようにします。
