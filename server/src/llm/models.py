# @file models.py
# @summary このファイルは、FastAPIアプリケーションで使用されるデータモデル（Pydanticモデル）を定義します。
# チャットメッセージ、チャットコンテキスト、LLMコマンド、LLMプロバイダー、およびチャット応答の構造を定義します。
# @responsibility アプリケーション内外でやり取りされるデータの整合性と構造を保証し、
# APIリクエストとレスポンスのバリデーションおよびシリアライゼーションをPydanticによって自動化します。
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List, Union, Literal


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None


class FileListItem(BaseModel):
    """フラット構造のファイルリストアイテム

    フラット構造では、ファイルはtitleのみで識別され、
    パスやディレクトリの概念はありません。
    """
    title: str
    type: Literal["file"] = "file"
    categories: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class FilelistScreenContext(BaseModel):
    """ファイルリスト画面のコンテキスト（フラット構造）

    フラット構造では、currentPathは不要です。
    すべてのファイルは単一の平坦なリストとして表示されます。
    """
    name: Literal["filelist"] = "filelist"
    visibleFileList: List[FileListItem]
    selectedFileList: Optional[List[FileListItem]] = None


class EditScreenContext(BaseModel):
    name: Literal["edit"] = "edit"
    filePath: str
    fileContent: str


class ChatContext(BaseModel):
    currentPath: Optional[str] = None
    fileList: Optional[List[Dict[str, Any]]] = None
    currentFile: Optional[str] = None
    currentFileContent: Optional[Dict[str, Optional[str]]] = None  # 現在開いているファイルの内容 {"filename": "...", "content": "..."}
    attachedFileContent: Optional[Dict[str, str]] = None
    conversationHistory: Optional[List[Dict[str, Any]]] = None
    activeScreen: Optional[Union[FilelistScreenContext, EditScreenContext]] = Field(None, discriminator='name')
    allFiles: Optional[List[Dict[str, Any]]] = None


class ChatRequest(BaseModel):
    message: str
    provider: str = "openai"
    model: str = "gpt-3.5-turbo"
    context: Optional[ChatContext] = None


class LLMCommand(BaseModel):
    """LLMが生成するコマンド（フラット構造）

    フラット構造では、titleベースでファイルを識別します。
    """
    action: str
    title: Optional[str] = None  # ファイル名（フラット構造では title で識別）
    new_title: Optional[str] = None  # リネーム時の新しいファイル名
    content: Optional[str] = None  # ファイルの内容
    categories: Optional[List[str]] = None  # カテゴリー
    tags: Optional[List[str]] = None  # タグ


class ChatResponse(BaseModel):
    message: str
    commands: Optional[List[LLMCommand]] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    historyCount: Optional[int] = None


class LLMProvider(BaseModel):
    name: str
    defaultModel: str
    models: List[str]
    status: str
