---
filename: 02_backend-flat-structure-migration
id: 2
status: implemented
priority: high
attempt_count: 1
tags: [backend, flat-structure, refactoring, API]
---

## 概要 (Overview)

バックエンド（server/）をフラット構造に対応させ、フロントエンドとの整合性を確保する。
現在、フロントエンドは既にフラット構造に移行済みだが、バックエンドはまだ階層構造（パスベース）を前提としているため、型定義とインターフェースに不整合が発生している。

## 背景 (Background)

### 現状の問題

**フロントエンド（app/）**: フラット構造に移行済み
```typescript
interface FileListItem {
  title: string;         // ファイル名のみ
  type: 'file';
  categories?: string[];
  tags?: string[];
}
```

**バックエンド（server/）**: 階層構造のまま
```python
class FileListItem(BaseModel):
    filePath: str          # ❌ パスベース
    tags: Optional[List[str]] = None

class FilelistScreenContext(BaseModel):
    currentPath: str       # ❌ ディレクトリパス
    visibleFileList: List[FileListItem]
```

この不整合により：
- フロントエンドから送信されるコンテキストをバックエンドが正しく処理できない
- LLMが生成するコマンド（path指定）とフロントエンドの期待（title指定）が合わない
- チャットコンテキスト機能が正常に動作しない

### フラット構造の利点

- パス管理が不要（シンプル）
- ファイル名（title）のみで識別
- カテゴリーとタグで柔軟な分類
- LLMにとって理解しやすい（記号の羅列であるUUIDやパスではなく、人間が読める名前）

## 実装方針 (Implementation Strategy)

### フェーズ1: 型定義の更新
`server/src/llm/models.py`の型定義をフラット構造に更新

### フェーズ2: コンテキストビルダーの更新
`server/src/llm/providers/context_builder.py`をフラット構造対応に修正

### フェーズ3: ツール（コマンドハンドラ）の更新/作成
- 新規作成: `create_file.py`, `delete_file.py`, `rename_file.py`
- 削除検討: `create_directory.py`, `move_item.py`, `delete_item.py`, `list_directory.py`, `search_files.py`
- 更新: `edit_file.py`, `read_file.py`（title→ID解決ロジック追加）

### フェーズ4: プロンプトテンプレートの更新
`server/src/llm/providers/config.py`のコンテキストメッセージを更新

### フェーズ5: ツール登録の更新
`server/src/llm/tools/__init__.py`でツールの登録を更新

## 受け入れ条件 (Acceptance Criteria)

- [x] `server/src/llm/models.py`がフラット構造の型定義に更新されている
  - [x] `FileListItem`: `filePath` → `title`, `categories`, `type` を追加
  - [x] `FilelistScreenContext`: `currentPath` を削除
  - [x] `LLMCommand`: `title`, `new_title`, `categories`, `tags` フィールドを追加（pathなど旧フィールドは削除）

- [x] `server/src/llm/providers/context_builder.py`がフラット構造に対応している
  - [x] `_setup_filelist_screen_context()`: titleベースの処理に変更
  - [x] `_format_file_item()`: カテゴリーとタグを含むフォーマット追加
  - [x] コンテキストメッセージが「カレントパス」を使用しない

- [x] フラット構造用ツールが実装されている
  - [x] `create_file.py`: titleでファイル作成
  - [x] `delete_file.py`: titleでファイル削除
  - [x] `rename_file.py`: titleでファイル名変更
  - [x] `edit_file.py`: titleパラメータに変更
  - [x] `read_file.py`: titleベースの検索に変更

- [x] 旧階層構造用ツールが削除されている
  - [x] `create_directory.py` - 削除完了
  - [x] `move_item.py` - 削除完了
  - [x] `delete_item.py` - 削除完了
  - [x] `list_directory.py` - 削除完了
  - [x] `search_files.py` - 削除完了

- [x] プロンプトテンプレートがフラット構造用に更新されている
  - [x] `DEFAULT_SYSTEM_PROMPT`: フラット構造の説明を追加
  - [x] `CONTEXT_MSG_FILELIST_SCREEN`: パス表記を削除

- [x] ツール登録が更新されている
  - [x] `server/src/llm/tools/__init__.py`: フラット構造用ツールのみ登録

- [ ] 統合テスト: フロントエンドからLLMを通じてファイル操作ができる
  - [ ] create_fileコマンドでファイル作成
  - [ ] delete_fileコマンドでファイル削除
  - [ ] rename_fileコマンドでファイル名変更
  - [ ] LLMがファイルリストを正しく認識

## 関連ファイル (Related Files)

### バックエンド（server/）
- `server/src/llm/models.py` - 型定義
- `server/src/llm/providers/context_builder.py` - コンテキスト構築
- `server/src/llm/providers/config.py` - プロンプトテンプレート
- `server/src/llm/tools/create_directory.py` - 削除対象
- `server/src/llm/tools/delete_item.py` - 削除対象
- `server/src/llm/tools/move_item.py` - 削除対象
- `server/src/llm/tools/list_directory.py` - 削除対象
- `server/src/llm/tools/search_files.py` - 削除対象
- `server/src/llm/tools/edit_file.py` - 更新対象
- `server/src/llm/tools/read_file.py` - 更新対象
- `server/src/llm/tools/__init__.py` - ツール登録

### フロントエンド（app/）- 参照用
- `app/features/chat/llmService/types/types.ts` - 型定義（フラット構造対応済み）
- `app/features/chat/types.ts` - 型定義（フラット構造対応済み）
- `app/features/chat/handlers/createFileHandlerFlat.ts` - 実装例
- `app/features/chat/handlers/deleteFileHandlerFlat.ts` - 実装例
- `app/features/chat/handlers/renameFileHandlerFlat.ts` - 実装例

## 制約条件 (Constraints)

- **後方互換性**: 旧階層構造のクライアントが存在する可能性がある場合、段階的な移行が必要
  - 今回はフロントエンドが既にフラット構造に完全移行しているため、後方互換性は不要

- **同名ファイル問題**: titleのみで識別するため、同名ファイルが存在する場合のエラーハンドリングが必要
  - 初期実装: 最初に見つかったファイルを操作（後で改善）
  - 将来: ユーザーに曖昧性を解消させる or カテゴリーも指定

- **LLMプロンプト**: パス表記からtitle表記への変更により、LLMの挙動が変わる可能性
  - プロンプトエンジニアリングで対応

- **パフォーマンス**: titleで検索するために全ファイルを取得する必要がある
  - 現時点ではファイル数が少ないため問題なし
  - 将来: インデックスやキャッシュで最適化

## 開発ログ (Development Log)

---
### 試行 #1

- **試みたこと:**
  - バックエンドとフロントエンドのインターフェース不整合を発見
  - フロントエンド側は既にフラット構造に移行済み
  - バックエンドがまだ階層構造（パスベース）を前提としていることを確認

- **結果:**
  - issueドキュメントを作成し、実装計画を立案

- **メモ:**
  - フロントエンドのフラット構造実装を参考にバックエンドを更新する
  - ツールの削除が必要（create_directory, move_item等）

---
### 試行 #2

- **試みたこと:**
  - Phase 1-5の全実装を実施
  - models.pyの型定義をフラット構造に更新（旧フィールドは完全削除）
  - context_builder.pyをフラット構造対応に更新
  - 新ツール作成: create_file.py, delete_file.py, rename_file.py
  - 既存ツール更新: edit_file.py, read_file.py（titleベースに変更）
  - 旧ツール削除: create_directory.py, move_item.py, delete_item.py, list_directory.py, search_files.py
  - プロンプトテンプレート更新（config.py）
  - ツール登録更新（__init__.py）

- **結果:**
  - バックエンドのフラット構造移行が完了
  - フロントエンドとバックエンドの型定義が整合
  - 全受け入れ条件のうち、実装部分はすべて完了

- **メモ:**
  - 統合テストはまだ未実施（次のステップ）
  - LangChainの@toolデコレータは自動的にツールスキーマを生成
  - カテゴリーとタグはカンマ区切り文字列として受け取る設計

---

## AIへの申し送り事項 (Handover to AI)

### 現在の状況（2025-10-28更新）
- ✅ フロントエンドは既にフラット構造に完全移行済み
- ✅ バックエンドのフラット構造移行が完了
- ✅ 型定義とインターフェースの整合性が確保された
- ⏳ 統合テストが残っている

### 完了した実装
1. ✅ **Phase 1**: 型定義の更新（models.py）
2. ✅ **Phase 2**: コンテキストビルダーの更新（context_builder.py）
3. ✅ **Phase 3**: ツールの作成・更新・削除
4. ✅ **Phase 4**: プロンプトテンプレートの更新（config.py）
5. ✅ **Phase 5**: ツール登録の更新（__init__.py）

### 次のアクション
1. **統合テスト**: フロントエンドとバックエンドの連携テスト
   - サーバーを起動して実際にLLMと対話
   - ファイル作成・削除・リネームが正常に動作することを確認
   - エラーハンドリングの確認

2. **潜在的な問題の確認**:
   - Pythonの構文エラーチェック
   - インポートエラーの確認
   - LangChainツールの登録が正しく機能するか

### 考慮事項/ヒント
- フロントエンドの実装パターンを参考にする
  - `app/features/chat/handlers/createFileHandlerFlat.ts`
  - `app/features/chat/handlers/deleteFileHandlerFlat.ts`
  - `app/features/chat/handlers/renameFileHandlerFlat.ts`

- Pythonでのtitleからファイル検索の実装例:
  ```python
  # すべてのファイルを取得してtitleで検索
  all_files = context.allFiles  # または適切なデータソースから取得
  target_file = next((f for f in all_files if f['title'] == title), None)
  if not target_file:
      raise FileNotFoundError(f"File not found: {title}")
  ```

- LLMプロンプトでは、titleベースでファイルを指定するよう明示
  ```
  例: create_file(title="新しいメモ", categories=["仕事"])
  ```

- 同名ファイルが存在する場合のエラーハンドリングは後回しでOK
  - 初期実装では最初に見つかったファイルを操作
  - 将来的に改善する際のTODOコメントを残す
