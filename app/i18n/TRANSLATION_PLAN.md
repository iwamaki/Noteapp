# 翻訳作業計画書 / Translation Work Plan

## 📋 概要 / Overview

このドキュメントは、Noteappの多言語対応（日本語・英語）を完了させるための作業計画書です。
既に設定画面は翻訳対応済みのため、残りの51ファイルを段階的に翻訳していきます。

**対応済みファイル:**
- ✅ `app/settings/SettingsScreen.tsx`
- ✅ `app/settings/components/TokenUsageSection.tsx`
- ✅ `app/settings/hooks/useSettingsHeader.tsx`

---

## 🎯 実装フェーズ / Implementation Phases

### Phase 1: 共通テキスト（最優先）
**目的:** 複数箇所で使用される共通テキストを翻訳し、重複を排除

#### 翻訳キー: `common.*`

```json
{
  "common": {
    "ok": "OK",
    "done": "完了",
    "error": "エラー",
    "cancel": "キャンセル",
    "button": {
      "save": "保存",
      "cancel": "キャンセル",
      "delete": "削除",
      "close": "閉じる",
      "retry": "再試行",
      "confirm": "確認",
      "create": "作成",
      "rename": "変更",
      "purchase": "購入する",
      "purchasing": "購入中...",
      "allocate": "配分する",
      "allocating": "配分中..."
    },
    "status": {
      "loading": "読み込み中...",
      "saving": "保存中...",
      "processing": "処理中...",
      "completed": "完了"
    },
    "error": {
      "generic": "失敗しました",
      "notFound": "見つかりません",
      "unavailable": "利用できません"
    }
  }
}
```

#### 対象ファイル:
- [ ] `app/components/InputFormModal.tsx`
- [ ] `app/components/ActionsListModal.tsx`
- [ ] `app/components/PurchaseConfirmModal.tsx`

---

### Phase 2: ファイル一覧・編集画面（高優先）
**目的:** ユーザーが最も頻繁に使用する画面を翻訳

#### 2.1 ファイル一覧画面

**翻訳キー: `fileList.*`**

```json
{
  "fileList": {
    "title": "ファイル一覧",
    "emptyState": "ファイルがありません。+ ボタンから新しいファイルを作成してください。",
    "deleteConfirm": {
      "title": "削除確認",
      "message": "「{{title}}」を削除しますか？この操作は取り消せません。"
    },
    "categoryDeleteConfirm": {
      "title": "カテゴリー削除",
      "message": "カテゴリー「{{category}}」を削除しますか？\n\nこのカテゴリーに含まれる{{count}}個のファイルは「未分類」に移動されます。\n\nカテゴリー自体のみが削除され、ファイルは保持されます。"
    },
    "moveMode": {
      "instruction": "移動先をタップしてください",
      "cancel": "キャンセル"
    },
    "error": {
      "attachFailed": "ファイルの添付に失敗しました",
      "moveFailed": "ファイルの移動に失敗しました"
    }
  }
}
```

**対象ファイル:**
- [ ] `app/screens/file-list-flat/FileListScreenFlat.tsx`

#### 2.2 ファイル編集画面

**翻訳キー: `fileEdit.*`**

```json
{
  "fileEdit": {
    "saved": "保存しました！",
    "unsavedChanges": {
      "title": "未保存の変更があります。",
      "message": "保存しますか？"
    },
    "button": {
      "save": "保存する",
      "dontSave": "保存しない"
    },
    "featureBar": {
      "placeholder": "ファイルのタイトル"
    }
  }
}
```

**対象ファイル:**
- [ ] `app/screens/file-edit/FileEditScreen.tsx`
- [ ] `app/screens/file-edit/components/FeatureBar.tsx`

#### 2.3 ファイル操作モーダル

**翻訳キー: `modals.createFile.*`, `modals.fileActions.*` 等**

```json
{
  "modals": {
    "createFile": {
      "title": "新規ファイル作成",
      "label": {
        "title": "タイトル",
        "category": "カテゴリー（階層パス）",
        "tags": "タグ（カンマ区切り）",
        "existingCategories": "既存のカテゴリー"
      },
      "placeholder": {
        "title": "ファイルタイトルを入力",
        "category": "例: 研究/AI/深層学習",
        "tags": "例: 重要, TODO"
      }
    },
    "fileActions": {
      "title": "ファイル操作",
      "attachToChat": "チャットに添付",
      "export": "エクスポート",
      "rename": "名前を変更",
      "editCategory": "カテゴリーを編集",
      "editTags": "タグを編集",
      "move": "移動",
      "copy": "コピーを作成",
      "delete": "削除"
    },
    "categoryEdit": {
      "title": "カテゴリーを編集",
      "message": "「{{fileName}}」のカテゴリーを編集します。",
      "placeholder": "例: 研究/AI/深層学習",
      "hint": "階層構造を表すには「/」で区切ってください（例: 研究/AI）"
    },
    "tagEdit": {
      "title": "タグを編集",
      "message": "「{{fileName}}」のタグを編集します。",
      "placeholder": "例: 重要, todo, アイデア",
      "hint": "複数のタグはカンマ（,）またはスペースで区切って入力してください。#は自動で削除されます。"
    },
    "categoryActions": {
      "title": "カテゴリー操作",
      "fileCount": "{{count}}個のファイル",
      "createQA": "Q&Aを作成",
      "export": "エクスポート",
      "rename": "名前を変更",
      "delete": "削除"
    },
    "renameItem": {
      "title": "ノート名を変更",
      "message": "新しいノート名を入力してください。",
      "placeholder": "新しいノート名"
    }
  }
}
```

**対象ファイル:**
- [ ] `app/screens/file-list-flat/components/CreateFileModal.tsx`
- [ ] `app/screens/file-list-flat/components/FileActionsModal.tsx`
- [ ] `app/screens/file-list-flat/components/CategoryEditModal.tsx`
- [ ] `app/screens/file-list-flat/components/TagEditModal.tsx`
- [ ] `app/screens/file-list-flat/components/CategoryActionsModal.tsx`
- [ ] `app/screens/file-list-flat/components/RenameItemModal.tsx`

---

### Phase 3: モデル設定・購入関連（中優先）

#### 3.1 モデル設定画面

**翻訳キー: `modelSelection.*`**

```json
{
  "modelSelection": {
    "title": "AIモデル設定",
    "loading": "モデル情報を読み込み中...",
    "quickModels": {
      "title": "Quickモデル一覧",
      "description": "日常的な会話や軽いタスクに使用するモデルを選択"
    },
    "thinkModels": {
      "title": "Thinkモデル一覧",
      "description": "複雑な推論や高度なタスクに使用するモデルを選択"
    },
    "tokenStatus": {
      "title": "トークン保持状況",
      "description": "買いすぎ予防：各カテゴリーのMax容量に対する保持量"
    },
    "balance": "残高：{{tokens}} トークン",
    "status": {
      "active": "適用中",
      "select": "選択",
      "noBalance": "残高なし"
    },
    "error": {
      "noModels": "利用可能なモデルがありません",
      "loadFailed": "モデル情報の読み込みに失敗しました"
    }
  }
}
```

**対象ファイル:**
- [ ] `app/screens/model-selection/ModelSelectionScreen.tsx`

#### 3.2 トークン購入画面

**翻訳キー: `tokenPurchase.*`**

```json
{
  "tokenPurchase": {
    "title": "購入",
    "confirmTitle": "購入確認",
    "confirmMessage": "{{packageName}}を購入しますか？",
    "credits": "クレジット:",
    "price": "価格:",
    "notice": {
      "title": "注意事項タイトル",
      "text": "注意事項の詳細テキスト"
    }
  }
}
```

**対象ファイル:**
- [ ] `app/screens/token-purchase/TokenPurchaseScreen.tsx`
- [ ] `app/screens/token-purchase/hooks/useTokenPurchaseHeader.tsx`

#### 3.3 クレジット配分モーダル

**翻訳キー: `modals.creditAllocation.*`**

```json
{
  "modals": {
    "creditAllocation": {
      "title": "💰 クレジット配分",
      "loading": "モデル情報を読み込み中...",
      "unallocatedCredits": "未配分クレジット:",
      "allocatingCredits": "配分するクレジット",
      "modelCategory": "{{category}}モデル",
      "categoryCapacity": "{{category}}カテゴリー容量",
      "before": "追加前",
      "after": "追加後",
      "warning": {
        "overLimit": "容量制限を超えています。最大{{credits}}Pまで配分できます。"
      }
    }
  }
}
```

**対象ファイル:**
- [ ] `app/screens/model-selection/components/CreditAllocationModal.tsx`

---

### Phase 4: チャット関連（中優先）

**翻訳キー: `chat.*`**

```json
{
  "chat": {
    "input": {
      "placeholder": "メッセージを入力..."
    },
    "loginRequired": {
      "title": "ログインが必要です",
      "message": "詳細メッセージ"
    },
    "history": {
      "title": "チャット履歴",
      "loading": "AI が処理中です..."
    },
    "modelSelection": {
      "title": "AIモデル選択",
      "quickModels": "Quickモデル",
      "thinkModels": "Thinkモデル",
      "loading": "モデル情報を読み込み中...",
      "error": {
        "noModels": "利用可能なモデルがありません",
        "loadFailed": "モデル情報の読み込みに失敗しました"
      }
    }
  }
}
```

**対象ファイル:**
- [ ] `app/features/chat/components/MessageInput.tsx`
- [ ] `app/features/chat/components/ChatHistory.tsx`
- [ ] `app/features/chat/components/ModelSelectionModal.tsx`

---

### Phase 5: インポート/エクスポート・Q&A作成（低優先）

#### 5.1 インポート/エクスポート

**翻訳キー: `importExport.*`**

```json
{
  "importExport": {
    "export": {
      "title": "エクスポート",
      "noFiles": "エクスポートするファイルがありません",
      "noCategoryFiles": "このカテゴリーにファイルがありません",
      "shareTitle": "ノートをエクスポート",
      "sharingUnavailable": "共有機能が利用できません",
      "failed": "エクスポートに失敗しました",
      "fileFailed": "ファイルのエクスポートに失敗しました",
      "categoryFailed": "カテゴリーのエクスポートに失敗しました"
    },
    "import": {
      "completed": "インポート完了",
      "failed": "インポートに失敗しました"
    },
    "error": {
      "fileNotFound": "ファイルが見つかりません"
    }
  }
}
```

**対象ファイル:**
- [ ] `app/screens/file-list-flat/hooks/useImportExport.tsx`

#### 5.2 Q&A作成（RAG）

**翻訳キー: `rag.*`**

```json
{
  "rag": {
    "createQA": {
      "title": "Q&A作成",
      "noFiles": "このカテゴリーにファイルがありません",
      "completed": "Q&A作成完了",
      "completedMessage": "詳細な成功メッセージ",
      "failed": "Q&A作成に失敗しました。"
    },
    "metadata": {
      "title": "タイトル:",
      "category": "カテゴリー:",
      "uncategorized": "未分類",
      "categoryPrefix": "カテゴリー: {{name}}",
      "categoryDescription": "{{count}}個のファイルを含むカテゴリー"
    }
  }
}
```

**対象ファイル:**
- [ ] `app/screens/file-list-flat/hooks/useRAGSync.tsx`

---

## 🔧 実装手順 / Implementation Steps

### 1. 翻訳ファイルの更新

各フェーズごとに:
1. `app/i18n/locales/ja.json` に日本語キーを追加
2. `app/i18n/locales/en.json` に英語翻訳を追加

### 2. コンポーネントの修正

各対象ファイルで:
1. `import { useTranslation } from 'react-i18next';` を追加
2. `const { t } = useTranslation();` を宣言
3. ハードコーディングされた日本語テキストを `t('key')` に置き換え
4. 動的な値がある場合は `t('key', { variable: value })` を使用

### 3. テスト

各フェーズ完了後:
1. 日本語表示の確認
2. 英語表示の確認（設定画面で言語を切り替え）
3. 動的な値の表示確認（変数の展開）

---

## 📝 進捗チェックリスト / Progress Checklist

### Phase 1: 共通テキスト
- [ ] 翻訳キー追加（ja.json, en.json）
- [ ] InputFormModal.tsx
- [ ] ActionsListModal.tsx
- [ ] PurchaseConfirmModal.tsx
- [ ] テスト完了

### Phase 2: ファイル一覧・編集
- [ ] 翻訳キー追加（ja.json, en.json）
- [ ] FileListScreenFlat.tsx
- [ ] FileEditScreen.tsx
- [ ] FeatureBar.tsx
- [ ] CreateFileModal.tsx
- [ ] FileActionsModal.tsx
- [ ] CategoryEditModal.tsx
- [ ] TagEditModal.tsx
- [ ] CategoryActionsModal.tsx
- [ ] RenameItemModal.tsx
- [ ] テスト完了

### Phase 3: モデル設定・購入
- [ ] 翻訳キー追加（ja.json, en.json）
- [ ] ModelSelectionScreen.tsx
- [ ] TokenPurchaseScreen.tsx
- [ ] useTokenPurchaseHeader.tsx
- [ ] CreditAllocationModal.tsx
- [ ] テスト完了

### Phase 4: チャット
- [ ] 翻訳キー追加（ja.json, en.json）
- [ ] MessageInput.tsx
- [ ] ChatHistory.tsx
- [ ] ModelSelectionModal.tsx
- [ ] テスト完了

### Phase 5: インポート/エクスポート・Q&A
- [ ] 翻訳キー追加（ja.json, en.json）
- [ ] useImportExport.tsx
- [ ] useRAGSync.tsx
- [ ] テスト完了

---

## 💡 Tips / ヒント

### 変数の埋め込み
```typescript
// Before
`「${title}」を削除しますか？`

// After
t('fileList.deleteConfirm.message', { title })
```

### 複数形の対応（将来的に）
```json
{
  "fileCount": "{{count}}個のファイル",
  "fileCount_one": "{{count}}個のファイル",
  "fileCount_other": "{{count}} files"
}
```

### Alert.alert の翻訳
```typescript
// Before
Alert.alert('エラー', 'ファイルの削除に失敗しました');

// After
Alert.alert(t('common.error'), t('fileList.error.deleteFailed'));
```

---

## 📅 推奨スケジュール / Recommended Schedule

- **Week 1**: Phase 1 + Phase 2 (ファイル一覧・編集)
- **Week 2**: Phase 3 (モデル設定・購入)
- **Week 3**: Phase 4 + Phase 5 (チャット + その他)
- **Week 4**: 全体テスト + 修正

---

## 📚 参考資料 / References

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- プロジェクト内の翻訳済みファイル: `app/settings/SettingsScreen.tsx`

---

**最終更新:** 2025-11-22
**作成者:** Claude Code
