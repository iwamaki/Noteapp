# @file models.py
# @summary このファイルは、FastAPIアプリケーションで使用されるデータモデル（Pydanticモデル）を定義します。
# チャットメッセージ、チャットコンテキスト、LLMコマンド、LLMプロバイダー、およびチャット応答の構造を定義します。
# @responsibility アプリケーション内外でやり取りされるデータの整合性と構造を保証し、
# APIリクエストとレスポンスのバリデーションおよびシリアライゼーションをPydanticによって自動化します。
from typing import Any, Literal

from pydantic import BaseModel, Field
from src.llm.providers.config import MAX_CONVERSATION_TOKENS, PRESERVE_RECENT_MESSAGES

from src.core.config import settings


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: str | None = None


class FilelistScreenContext(BaseModel):
    """ファイルリスト画面のコンテキスト（フラット構造）

    Note: visibleFileList は廃止（冗長）
    全ファイル情報は ChatContext.allFiles として送信される
    """
    name: Literal["filelist"] = "filelist"


class EditScreenContext(BaseModel):
    name: Literal["edit"] = "edit"
    filePath: str
    fileContent: str


class ChatContext(BaseModel):
    currentPath: str | None = None
    fileList: list[dict[str, Any]] | None = None
    currentFile: str | None = None
    currentFileContent: dict[str, str | None] | None = None  # 現在開いているファイルの内容 {"filename": "...", "content": "..."}
    attachedFileContent: list[dict[str, str]] | None = None  # 添付ファイルの内容（複数対応）
    conversationHistory: list[dict[str, Any]] | None = None
    activeScreen: FilelistScreenContext | EditScreenContext | None = Field(None, discriminator='name')
    allFiles: list[dict[str, Any]] | None = None
    sendFileContextToLLM: bool | None = None  # ファイルコンテキストをLLMに送信するかどうか


class ChatRequest(BaseModel):
    message: str
    provider: str = Field(default_factory=lambda: settings.get_default_provider())
    model: str = Field(default_factory=lambda: settings.get_default_model())
    context: ChatContext | None = None
    client_id: str | None = None  # WebSocket接続のクライアントID


class LLMCommand(BaseModel):
    """LLMが生成するコマンド（フラット構造）

    フラット構造では、titleベースでファイルを識別します。
    """
    action: str
    title: str | None = None  # ファイル名（フラット構造では title で識別）
    new_title: str | None = None  # リネーム時の新しいファイル名
    content: str | None = None  # ファイルの内容
    category: str | None = None  # カテゴリー（階層パス形式: "研究/AI"）
    tags: list[str] | None = None  # タグ

    # 行ベース編集用フィールド（edit_file_linesツール用）
    start_line: int | None = None  # 開始行（1-based, inclusive）
    end_line: int | None = None  # 終了行（1-based, inclusive）


class TokenUsageInfo(BaseModel):
    """トークン使用量情報

    フロントエンドで要約が必要かどうかを判断するための情報。
    また、今回のリクエストで実際に使用した入出力トークン数も含む。
    """
    currentTokens: int  # 現在の会話履歴のトークン数
    maxTokens: int  # 推奨される最大トークン数
    usageRatio: float  # 使用率（0.0-1.0）
    needsSummary: bool  # 要約が推奨されるかどうか

    # 今回のリクエストで実際に使用したトークン数（課金対象）
    inputTokens: int | None = None  # 入力トークン数
    outputTokens: int | None = None  # 出力トークン数
    totalTokens: int | None = None  # 合計トークン数


class ChatResponse(BaseModel):
    message: str
    commands: list[LLMCommand] | None = None
    provider: str | None = None
    model: str | None = None
    historyCount: int | None = None
    tokenUsage: TokenUsageInfo | None = None  # トークン使用量情報
    warning: str | None = None  # 警告メッセージ（トークン不足など）
    error: str | None = None  # エラーメッセージ


class CostInfo(BaseModel):
    """原価情報（USD/1M tokens）"""
    inputPricePer1M: float
    outputPricePer1M: float


class PricingInfo(BaseModel):
    """価格情報"""
    cost: CostInfo  # 原価（USD）
    sellingPriceJPY: float  # 販売価格（JPY/1M tokens）


class ModelMetadata(BaseModel):
    """モデルのメタデータ

    モデルのカテゴリー、表示名、説明などの追加情報。
    """
    category: str  # "quick" or "think"
    displayName: str | None = None
    description: str | None = None
    recommended: bool | None = False
    pricing: PricingInfo | None = None  # 価格情報


class LLMProvider(BaseModel):
    name: str
    defaultModel: str
    models: list[str]
    status: str
    modelMetadata: dict[str, ModelMetadata] | None = None


class SummarizeRequest(BaseModel):
    """会話履歴の要約リクエスト

    長い会話履歴を圧縮して、重要な情報を保持したまま
    トークン数を削減するためのリクエストモデル。
    """
    conversationHistory: list[dict[str, Any]]  # 要約対象の会話履歴
    max_tokens: int | None = MAX_CONVERSATION_TOKENS  # 圧縮後の最大トークン数
    preserve_recent: int | None = PRESERVE_RECENT_MESSAGES  # 保持する最新メッセージ数
    provider: str | None = Field(default_factory=lambda: settings.get_default_provider())  # 要約に使用するLLMプロバイダー
    model: str | None = None  # 要約に使用するモデル（Noneの場合はデフォルト）


class SummaryResult(BaseModel):
    """要約された会話コンテキスト

    システムメッセージとして会話履歴に挿入される要約。
    """
    role: Literal["system"] = "system"
    content: str  # 要約されたテキスト
    timestamp: str | None = None


class SummarizeResponse(BaseModel):
    """会話履歴の要約レスポンス

    要約されたシステムメッセージと、保持された最新メッセージ、
    圧縮統計情報を含む。
    """
    summary: SummaryResult  # 要約されたシステムメッセージ
    recentMessages: list[dict[str, Any]]  # 保持された最新メッセージ
    compressionRatio: float  # 圧縮率（0.0-1.0）
    originalTokens: int  # 元のトークン数
    compressedTokens: int  # 圧縮後のトークン数
    tokenUsage: TokenUsageInfo | None = None  # 実際のトークン使用量（課金用）
    model: str | None = None  # 使用したモデル名
