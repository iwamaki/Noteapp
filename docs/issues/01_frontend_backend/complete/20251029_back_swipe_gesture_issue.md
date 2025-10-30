---
filename: 20251029_back_swipe_gesture_issue # "[作成日時]_[issueのタイトル]"
id: 1 # issueのユニークID
status: new # new | in-progress | blocked | pending-review | done
priority: medium # A:high | B:medium | C:low
attempt_count: 0 # このissueへの挑戦回数。失敗のたびにインクリメントする
tags: [UI, navigation, bug] # 例: [UI, navigation, bug]
date: 2025/10/29 # issue作成日時
---

## 概要 (Overview)

ファイルリスト画面でアイテムを長押ししてメニューが表示されている際に、スマートフォンのスワイプによる「戻る」ジェスチャーがアプリを終了させてしまう問題を解決します。

## 背景 (Background)

ファイルリスト画面でアイテムを長押しすると、ヘッダーに選択モード用のメニューが表示されます。このメニューには「戻る」ボタン（`Ionicons name="arrow-back"`）が含まれていますが、これは画面遷移ではなく選択モードを解除するためのものです。この状態でスマートフォンのシステムレベルの「戻る」スワイプジェスチャーを使用すると、アプリが予期せず終了してしまいます。ユーザーはメニューを閉じたいと期待しているため、この挙動はUXを損なっています。

## 実装方針 (Implementation Strategy)

*   選択モード中にシステムレベルの「戻る」ジェスチャーをインターセプトし、メニューを閉じる動作にマッピングします。
*   選択モード時のヘッダーに表示される「戻る」ボタンのアイコンを、その機能（選択モードの解除）をより正確に表すもの（例: 「閉じる」アイコン）に変更します。

## 受け入れ条件 (Acceptance Criteria)

*   [ ] ファイルリスト画面でアイテムを長押しして選択モードに入った際、スマートフォンの「戻る」スワイプジェスチャーでアプリが終了しないこと。
*   [ ] 「戻る」スワイプジェスチャーが、選択モードを解除する動作として機能すること。
*   [ ] 選択モード時のヘッダーに表示される左側のボタンが、ナビゲーションの「戻る」ではなく、選択モードの解除を意味するアイコン（例: 「閉じる」アイコン）になっていること。

## 関連ファイル (Related Files)

*   `app/screen/file-list-flat/FileListScreenFlat.tsx`
*   `app/screen/file-list-flat/hooks/useFileListHeader.tsx`
*   `app/navigation/RootNavigator.tsx` (参考として)

## 制約条件 (Constraints)

*   既存のナビゲーションスタックの挙動に影響を与えないこと。
*   Androidのハードウェアバックボタンも同様に処理されること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** （実行した計画の要約）
- **結果:** （成功、失敗、発生したエラーなど）
- **メモ:** （次のセッションへの申し送り事項、気づきなど）

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** ユーザーからの要望に基づき、ファイルリスト画面での「戻る」スワイプジェスチャーに関するUX改善のissueを作成しました。実装はまだ行っていません。
- **次のアクション:** このissueに記載された実装方針に基づき、`FileListScreenFlat.tsx` および `useFileListHeader.tsx` の変更を検討してください。
- **考慮事項/ヒント:** まず `FileListScreenFlat.tsx` に `BackHandler` を追加し、次に `useFileListHeader.tsx` のアイコンを変更する手順が考えられます。
