---
title: "[B]_24_Header Button Text Truncation"
id: 24
status: done
priority: medium
attempt_count: 1
tags: [UI, bug, header]
---

## 概要 (Overview)

ヘッダーボタンのテキストが、利用可能なスペースを超えた場合に途中で途切れてしまう問題を修正しました。特に、検索モード時の「Cancel」ボタンのテキストが不完全に表示される事象が確認されていました。

## 背景 (Background)

`NoteListScreen`などのヘッダーに表示されるテキストボタン（例: 検索モード時の「Cancel」ボタン）において、ボタンのテキストが長すぎる場合に、テキストが途中で切れてしまう視覚的な不具合が報告されました。これは、`HeaderButton`コンポーネント内の`Text`コンポーネントが、テキストの折り返しや省略処理を明示的に指定していなかったため、固定されたヘッダーの高さと相まって、テキストが垂直方向にクリップされてしまうことが原因でした。

## 実装方針 (Implementation Strategy)

`HeaderButton`コンポーネント内の`Text`コンポーネントに、以下のプロパティを追加することで、テキストの表示を改善しました。
- `numberOfLines={1}`: テキストが常に1行で表示されるようにします。
- `ellipsizeMode="tail"`: テキストが利用可能なスペースを超えた場合に、末尾に三点リーダー（`...`）を表示して省略するようにします。
これにより、テキストが不自然に途切れることなく、視覚的に分かりやすく表示されるようになります。

## 受け入れ条件 (Acceptance Criteria)

- [ ] ヘッダーに表示されるテキストボタンのテキストが、利用可能なスペースを超えても途中で不自然に途切れないこと。
- [ ] テキストが長すぎる場合、末尾に三点リーダーが表示され、1行に収まっていること。
- [ ] 特に、検索モード時の「Cancel」ボタンのテキストが完全に表示されるか、適切に省略されること。
- [ ] `CustomHeader`を使用している他の画面（`NoteEditScreen`, `DiffViewScreen`, `VersionHistoryScreen`, `SettingsScreen`など）のヘッダーボタンにおいても、同様の改善が適用されていること。

## 関連ファイル (Related Files)

- `app/components/HeaderButton.tsx`
- `app/components/CustomHeader.tsx`
- `app/screen/note-list/hooks/useNoteListHeader.tsx`
- `app/screen/note-edit/hooks/useNoteEditHeader.tsx`
- `app/screen/diff-view/hooks/useDiffView.tsx`
- `app/screen/version-history/VersionHistoryScreen.tsx`
- `app/settings/SettingsScreen.tsx`

## 制約条件 (Constraints)

- 既存のヘッダーの高さ（44単位）は変更しないこと。
- ボタンの視覚的なデザイン（色、フォントサイズなど）は維持すること。
- テキストが省略される場合でも、ボタンの機能が明確に伝わるようにすること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `HeaderButton.tsx`内の`Text`コンポーネントに`numberOfLines={1}`と`ellipsizeMode="tail"`を追加。
- **結果:** 成功。テキストの途切れが解消され、長すぎるテキストは適切に省略されるようになった。
- **メモ:** この変更は、`HeaderButton`を使用するすべてのヘッダーボタンに影響を与えるため、広範なテストが必要。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** ヘッダーボタンのテキスト途切れ問題は修正済み。関連する`HeaderButton.tsx`が更新されました。
- **次のアクション:** ユーザーからの追加のフィードバックや、この修正によって発生する可能性のある新たな問題がないかを確認してください。特に、`CustomHeader`を使用している他の画面での表示に問題がないか、視覚的な確認を行うことを推奨します。
- **考慮事項/ヒント:** 修正後の動作確認として、各画面でテキストが長いボタンや、複数のボタンが並ぶケースを試してみてください。
