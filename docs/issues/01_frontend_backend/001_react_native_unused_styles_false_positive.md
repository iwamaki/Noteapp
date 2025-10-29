---
filename:  001_react_native_unused_styles_false_positive
id: 0 # issueのユニークID
status: new # new | in-progress | blocked | pending-review | done
priority: medium # A:high | B:medium | C:low
attempt_count: 0 # このissueへの挑戦回数。失敗のたびにインクリメントする
tags: [lint, react-native, bug]
---

## 概要 (Overview)

`react-native/no-unused-styles` ESLint ルールが誤検知を起こし、実際には使用されているスタイルを「未使用」として報告する問題の解決。

## 背景 (Background)

`npm run lint` 実行時に `react-native/no-unused-styles` 警告が多数発生している。詳細な調査により、一部のコンポーネントで、`useMemo` 内での `StyleSheet.create` や条件付きスタイリングなど、特定のパターンで定義されたスタイルが、実際には使用されているにもかかわらずリンターによって「未使用」と誤って報告されていることが判明した。これは `eslint-plugin-react-native` の既知の課題である。この誤検知により、開発者が本当に未使用のスタイルと誤検知されたスタイルを区別することが困難になっている。

## 実装方針 (Implementation Strategy)

`react-native/no-unused-styles` ルールによる誤検知を解消するための最適なアプローチを特定し、実装する。リンター設定の調整、またはスタイルの定義方法のリファクタリングを検討する。

## 受け入れ条件 (Acceptance Criteria)

- [x] `react-native/no-unused-styles` の誤検知が解消されること。
- [ ] 実際に未使用のスタイルは引き続き警告されること（ルールを完全に無効化しない場合）。
- [ ] アプリケーションのUI/UXに影響がないこと。
- [ ] リンティング実行時に、本件に関する誤検知の警告が発生しないこと。

## 関連ファイル (Related Files)

- `eslint.config.js`
- `package.json`
- `app/**/*.tsx` (特にスタイル定義を含むコンポーネントファイル)

## 制約条件 (Constraints)

- アプリケーションの動作やパフォーマンスに悪影響を与えないこと。
- 可能な限り、リンティングルールを完全に無効化するのではなく、誤検知を回避する方向で対応すること。
- 既存のコードベースのスタイルやパターンを尊重すること。

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:** `npm run lint` を実行し、`react-native/no-unused-styles` 警告が多数発生することを確認。一部のコンポーネントで、リンターが「未使用」と指摘しているスタイルが実際には使用されていることを確認した。
- **結果:** `react-native/no-unused-styles` が誤検知を起こしていることを特定。
- **メモ:** 誤検知の原因は、`useMemo` 内での `StyleSheet.create` や条件付きスタイリングの適用方法にある可能性が高い。

---
### 試行 #2

- **試みたこと:** Web検索により、`useMemo` や条件付きスタイリングが原因で `react-native/no-unused-styles` が誤検知を起こす既知の問題であることを確認。対応策として、ルールの一時的な無効化とスタイルのリファクタリングがあることを把握した。
- **結果:** 問題の背景と一般的な解決策を理解した。
- **メモ:** 今後の対応方針として、リンター設定の調整またはスタイルのリファクタリングを検討する必要がある。

---

## AIへの申し送り事項 (Handover to AI)

- **現在の状況:** `react-native/no-unused-styles` の誤検知問題について、原因と一般的な対応策を把握済み。
- **次のアクション:** `react-native/no-unused-styles` ルールによる誤検知を解消するための最適なアプローチを検討し、実装計画を立てる。リンター設定の調整、またはスタイルの定義方法のリファクタリングのどちらがこのプロジェクトにとって最も適切かを判断すること。
- **考慮事項/ヒント:** `eslint-plugin-react-native` の設定オプションや、React Nativeにおけるスタイルのベストプラクティスを考慮に入れること。