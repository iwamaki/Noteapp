# フェーズ0: 型定義の修正

## 目的
イベント駆動アーキテクチャへのリファクタリングを進めるにあたり、アプリケーション全体で使用される主要な型定義の一貫性を確保することを目的とします。特に、`Note`インターフェースの定義が`app/services/storageService.ts`と`shared/types/note.ts`で異なっていた点を修正し、型安全性を向上させます。

## 実施内容

### 変更ファイル
- `/home/iwash/02_Repository/Noteapp/shared/types/note.ts`

### 変更詳細
`shared/types/note.ts`内の`Note`インターフェースに、`app/services/storageService.ts`で定義されていた`tags?: string[];`プロパティを追加しました。

**変更前 (shared/types/note.ts):**
```typescript
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
```

**変更後 (shared/types/note.ts):**
```typescript
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  tags?: string[]; // 追加
}
```

## 変更の根拠
`app/services/storageService.ts`では、`Note`オブジェクトが`tags?: string[];`プロパティを持つことが期待されており、実際にノートの作成・更新時に`tags`が扱われていました。しかし、`shared/types/note.ts`の`Note`インターフェースにはこのプロパティが欠落しており、型定義の不一致が生じていました。

この不一致は、コンパイルエラーやランタイムエラーの原因となる可能性があり、特にイベント駆動アーキテクチャにおいて`Note`オブジェクトがイベントペイロードとして渡される際に、予期せぬ型関連の問題を引き起こす恐れがありました。

フェーズ0としてこの型定義の修正を先行して行うことで、以降のフェーズで`EventBus`や`CommandExecutor`を実装する際に、`Note`オブジェクトの型に関する懸念を排除し、より安全かつスムーズな開発を可能にします。

## 完了確認
- `shared/types/note.ts`の`Note`インターフェースに`tags?: string[];`が追加されたことを確認。
- 関連するコードベースで型エラーが発生していないことを確認。

---
