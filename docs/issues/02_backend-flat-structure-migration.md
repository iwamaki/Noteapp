---
filename: 02_backend-flat-structure-migration
id: 2
status: new
priority: high
attempt_count: 0
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

- [ ] `server/src/llm/models.py`がフラット構造の型定義に更新されている
  - `FileListItem`: `filePath` → `title`, `categories`, `type` を追加
  - `FilelistScreenContext`: `currentPath` を削除
  - `LLMCommand`: `title`, `new_title`, `categories`, `tags` フィールドを追加
  - `ChatContext.allFiles`の型をフラット構造用に更新

- [ ] `server/src/llm/providers/context_builder.py`がフラット構造に対応している
  - `_setup_filelist_screen_context()`: `currentPath`を使わない、`title`ベースの処理
  - コンテキストメッセージが「カレントパス」ではなく「全ファイル一覧」を表示

- [ ] フラット構造用ツールが実装されている
  - [ ] `create_file.py`: titleでファイル作成
  - [ ] `delete_file.py`: titleでファイル削除
  - [ ] `rename_file.py`: titleでファイル名変更
  - [ ] `edit_file.py`: titleからファイルを検索して編集
  - [ ] `read_file.py`: titleからファイルを検索して読み込み

- [ ] 旧階層構造用ツールが削除またはdeprecated化されている
  - [ ] `create_directory.py` - 削除（フォルダ概念なし）
  - [ ] `move_item.py` - 削除（パス移動の概念なし）
  - [ ] `delete_item.py` - 削除（delete_fileに統合）
  - [ ] `list_directory.py` - 削除（allFilesで提供）
  - [ ] `search_files.py` - 削除または簡素化（title検索のみ）

- [ ] プロンプトテンプレートがフラット構造用に更新されている
  - `CONTEXT_MSG_FILELIST_SCREEN`: パス表記を削除、title+categories+tagsを表示

- [ ] TypeScriptの型チェックが通る（`npx tsc --noEmit`）

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

## AIへの申し送り事項 (Handover to AI)

### 現在の状況
- フロントエンドは既にフラット構造に完全移行済み
- バックエンドは階層構造のまま残っている
- 型定義とインターフェースに不整合あり
- issueドキュメントと実装計画は作成済み

### 次のアクション
1. **フェーズ1**: `server/src/llm/models.py`の型定義を更新
   - `FileListItem`, `FilelistScreenContext`, `LLMCommand`をフラット構造に

2. **フェーズ2**: `server/src/llm/providers/context_builder.py`を更新
   - `_setup_filelist_screen_context()`をフラット構造対応に

3. **フェーズ3**: フラット構造用ツールを作成
   - `create_file.py`, `delete_file.py`, `rename_file.py`を新規作成
   - フロントエンドの`app/features/chat/handlers/*Flat.ts`を参考に実装

4. **フェーズ4**: プロンプトテンプレートを更新
   - `server/src/llm/providers/config.py`のメッセージテンプレート

5. **フェーズ5**: 旧ツールの削除とツール登録の更新
   - `server/src/llm/tools/__init__.py`

6. **テスト**: 実際にLLMとの対話でファイル操作ができることを確認

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
