
# @file config.py
# @summary アプリケーションの設定を管理します。APIキーの読み込みなど。
# @responsibility 環境変数やSecret Managerから設定値を読み込み、アプリケーション全体で利用できるように提供します。
import os
from google.cloud import secretmanager
from google.api_core import exceptions
from dotenv import load_dotenv
from .logger import logger

# 環境変数の読み込み
load_dotenv()

class Settings:
    def __init__(self):
        self.gemini_api_key: str | None = None

        # LLMのデフォルト設定（Gemini専用）
        self.default_llm_provider: str = "gemini"
        self.default_llm_models: dict[str, str] = {
            "gemini": "gemini-2.5-flash"
        }

        # プロバイダーごとの利用可能なモデルリスト
        self.available_models: dict[str, list[str]] = {
            "gemini": ["gemini-2.5-flash", "gemini-2.5-pro"]
        }

        # プロバイダーの表示名
        self.provider_display_names: dict[str, str] = {
            "gemini": "Google Gemini"
        }

        gcp_project_id = os.getenv("GCP_PROJECT_ID")
        gemini_secret_id = os.getenv("GEMINI_API_SECRET_ID", "GOOGLE_API_KEY")

        # GOOGLE_APPLICATION_CREDENTIALS が設定されている場合、Secret Managerを試す
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            try:
                client = secretmanager.SecretManagerServiceClient()

                # Gemini APIキーの取得
                if gcp_project_id and gemini_secret_id:
                    self.gemini_api_key = self._get_secret(client, gcp_project_id, gemini_secret_id)

            except Exception as e:
                logger.warning(f"Could not initialize Secret Manager client: {e}. Falling back to environment variables.")

        # Secret Managerで取得できなかった場合、環境変数からフォールバック
        if not self.gemini_api_key:
            self.gemini_api_key = os.getenv("GEMINI_API_KEY")

    def _get_secret(self, client, project_id: str, secret_id: str) -> str | None:
        """Secret Managerから最新バージョンのシークレットを取得する"""
        secret_name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
        try:
            response = client.access_secret_version(request={"name": secret_name})
            return response.payload.data.decode("UTF-8").strip()
        except exceptions.NotFound:
            logger.warning(f"Secret {secret_id} not found in project {project_id}. Falling back to environment variable.")
        except Exception as e:
            logger.warning(f"Error accessing secret {secret_id}: {e}. Falling back to environment variable.")
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
