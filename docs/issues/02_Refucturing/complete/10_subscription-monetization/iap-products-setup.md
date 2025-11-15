# Google Play Console - トークン購入アイテム登録ガイド

## 商品タイプ
**消費型アイテム** (Consumable / Managed Product)

---

## Flash トークンパッケージ

### 1. 初回購入 (Flash)
- **Product ID**: `noteapp.tokens.first`
- **商品名**: 初回購入 (Flash)
- **説明**: 初めてのトークン購入 - 低コストモデル用
- **価格**: ¥300
- **トークン数**: 500,000 Flash トークン
- **Purchase Option ID**: `first` (ドットなし)

### 2. Flash スモール
- **Product ID**: `noteapp.tokens.small`
- **商品名**: Flash スモール
- **説明**: 少量のFlashトークンが必要な方に
- **価格**: ¥300
- **トークン数**: 500,000 Flash トークン
- **Purchase Option ID**: `small`

### 3. Flash レギュラー
- **Product ID**: `noteapp.tokens.regular`
- **商品名**: Flash レギュラー
- **説明**: Flashモデルの標準的な使用量に対応
- **価格**: ¥500
- **トークン数**: 1,000,000 Flash トークン
- **Purchase Option ID**: `regular`

### 4. Flash ラージ
- **Product ID**: `noteapp.tokens.large`
- **商品名**: Flash ラージ
- **説明**: Flashモデルのヘビーユーザー向け
- **価格**: ¥1,000
- **トークン数**: 2,500,000 Flash トークン
- **Purchase Option ID**: `large`

---

## Pro トークンパッケージ

### 5. Pro スモール
- **Product ID**: `noteapp.tokens.pro.small`
- **商品名**: Pro スモール
- **説明**: 少量のProトークンが必要な方に
- **価格**: ¥300
- **トークン数**: 100,000 Pro トークン
- **Purchase Option ID**: `prosmall` (ドットなし)

### 6. Pro レギュラー
- **Product ID**: `noteapp.tokens.pro.regular`
- **商品名**: Pro レギュラー
- **説明**: Proモデルの標準的な使用量に対応
- **価格**: ¥500
- **トークン数**: 250,000 Pro トークン
- **Purchase Option ID**: `proregular`

### 7. Pro ラージ
- **Product ID**: `noteapp.tokens.pro.large`
- **商品名**: Pro ラージ
- **説明**: Proモデルのヘビーユーザー向け
- **価格**: ¥1,000
- **トークン数**: 600,000 Pro トークン
- **Purchase Option ID**: `prolarge`

---

## 登録手順

1. Google Play Console にログイン
2. アプリを選択
3. 左メニュー「収益化」→「アプリ内アイテム」
4. 「管理対象のアイテムを作成」をクリック
5. 上記の情報を入力して保存
6. **全7アイテムを登録**

---

## 注意事項

- **Product ID** は変更不可（慎重に入力）
- **Purchase Option ID** にはドット(.)を使用不可
- 商品名・説明は後から変更可能
- 価格は地域ごとに設定可能（日本: JPYで設定）
- すべて **消費型アイテム** として登録
- 開発中は「テスト中」のままでOK（公開不要）

---

## 現在の登録状況

✅ noteapp.tokens.first - 登録済み
⬜ noteapp.tokens.small - 未登録
⬜ noteapp.tokens.regular - 未登録
⬜ noteapp.tokens.large - 未登録
⬜ noteapp.tokens.pro.small - 未登録
⬜ noteapp.tokens.pro.regular - 未登録
⬜ noteapp.tokens.pro.large - 未登録

---

## トークン価格の考え方

### Flash トークン（低コストモデル用）
- ¥300 → 500k トークン (¥0.6/1k)
- ¥500 → 1M トークン (¥0.5/1k) **← お得**
- ¥1,000 → 2.5M トークン (¥0.4/1k) **← 最もお得**

### Pro トークン（高性能モデル用）
- ¥300 → 100k トークン (¥3.0/1k)
- ¥500 → 250k トークン (¥2.0/1k) **← お得**
- ¥1,000 → 600k トークン (¥1.67/1k) **← 最もお得**

*Proトークンは、実際のAPI価格に基づき、Flashの約5倍のコストに設定*
