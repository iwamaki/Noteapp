
# @file config.py
# @summary アプリケーション設定管理
# @responsibility 環境変数、Secret Manager、LLMモデル設定を一元管理
import os
from google.cloud import secretmanager
from google.api_core import exceptions
from dotenv import load_dotenv
from .logger import logger

# 環境変数の読み込み
load_dotenv()


class Settings:
    def __init__(self):
        # ========================================
        # APIキー設定
        # ========================================
        self.gemini_api_key: str | None = None

        # ========================================
        # LLMプロバイダー設定
        # ========================================
        self.default_llm_provider: str = "gemini"

        self.provider_display_names: dict[str, str] = {
            "gemini": "Google Gemini"
        }

        # ========================================
        # モデル設定
        # ========================================
        # デフォルトモデル
        self.default_llm_models: dict[str, str] = {
            "gemini": "gemini-2.5-flash"
        }

        # 利用可能なモデル一覧
        self.available_models: dict[str, list[str]] = {
            "gemini": [
                "gemini-2.5-flash",
                "gemini-2.5-pro",
                "gemini-1.5-flash",
                "gemini-1.5-pro"
            ]
        }

        # モデルメタデータ（カテゴリー、表示名、説明、推奨フラグ）
        # フロントエンドの画面表示やトークン管理に使用される
        self.model_metadata: dict[str, dict] = {
            "gemini-2.5-flash": {
                "category": "quick",           # Quick/Thinkカテゴリー
                "displayName": "Gemini 2.5 Flash",
                "description": "高速・最新版（推奨）",
                "recommended": True,
            },
            "gemini-2.5-pro": {
                "category": "think",
                "displayName": "Gemini 2.5 Pro",
                "description": "最高性能・複雑なタスク向け（推奨）",
                "recommended": True,
            },
            "gemini-1.5-flash": {
                "category": "quick",
                "displayName": "Gemini 1.5 Flash",
                "description": "安定版・実績あり",
                "recommended": False,
            },
            "gemini-1.5-pro": {
                "category": "think",
                "displayName": "Gemini 1.5 Pro",
                "description": "安定版・コスト重視",
                "recommended": False,
            },
        }

        # ========================================
        # APIキーの読み込み（Secret Manager → 環境変数の順）
        # ========================================
        gcp_project_id = os.getenv("GCP_PROJECT_ID")
        gemini_secret_id = os.getenv("GEMINI_API_SECRET_ID", "GOOGLE_API_KEY")

        # GOOGLE_APPLICATION_CREDENTIALS が設定されている場合、Secret Managerから取得を試みる
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            try:
                client = secretmanager.SecretManagerServiceClient()
                if gcp_project_id and gemini_secret_id:
                    self.gemini_api_key = self._get_secret(client, gcp_project_id, gemini_secret_id)
            except Exception as e:
                logger.warning(f"Secret Manager initialization failed: {e}. Using environment variables.")

        # Secret Managerで取得できなかった場合は環境変数からフォールバック
        if not self.gemini_api_key:
            self.gemini_api_key = os.getenv("GEMINI_API_KEY")

    def _get_secret(self, client, project_id: str, secret_id: str) -> str | None:
        """Secret Managerから最新バージョンのシークレットを取得

        Args:
            client: Secret Managerクライアント
            project_id: GCPプロジェクトID
            secret_id: シークレットID

        Returns:
            シークレット値（取得失敗時はNone）
        """
        secret_name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
        try:
            response = client.access_secret_version(request={"name": secret_name})
            return response.payload.data.decode("UTF-8").strip()
        except exceptions.NotFound:
            logger.warning(f"Secret '{secret_id}' not found in project '{project_id}'.")
        except Exception as e:
            logger.warning(f"Error accessing secret '{secret_id}': {e}")
        return None

    def get_default_provider(self) -> str:
        """デフォルトのLLMプロバイダーを取得する"""
        return self.default_llm_provider

    def get_default_model(self, provider: str | None = None) -> str:
        """指定されたプロバイダーのデフォルトモデルを取得する

        Args:
            provider: プロバイダー名（Noneの場合はデフォルトプロバイダー）

        Returns:
            モデル名
        """
        if provider is None:
            provider = self.default_llm_provider
        return self.default_llm_models.get(provider, self.default_llm_models[self.default_llm_provider])

# 設定インスタンスを作成
settings = Settings()
