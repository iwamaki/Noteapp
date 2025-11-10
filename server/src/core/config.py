
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

        # サブスクリプションプラン定義
        # フロントエンド（app/constants/plans.ts）と同期する必要があります
        self.subscription_tiers = {
            "free": {
                "max_files": 50,
                "max_llm_requests": 100,
                "max_storage_mb": 100,
                "max_file_size_mb": 10,
                "features": [
                    "llm.chat",
                    "llm.streaming",
                    "search.fulltext",
                    "file.basic_edit",
                    "file.create_delete",
                    "file.export",
                    "backup.manual",
                    "category.basic",
                    "tag.basic",
                    "ui.theme_customization",
                    "support.community",
                ]
            },
            "pro": {
                "max_files": 1000,
                "max_llm_requests": 1000,
                "max_storage_mb": 5000,
                "max_file_size_mb": 50,
                "features": [
                    "llm.chat",
                    "llm.advanced_models",
                    "llm.custom_system_prompt",
                    "llm.extended_context",
                    "llm.streaming",
                    "search.rag",
                    "search.web",
                    "search.semantic",
                    "search.fulltext",
                    "file.basic_edit",
                    "file.create_delete",
                    "file.batch_operations",
                    "file.version_history",
                    "file.export",
                    "file.advanced_export",
                    "sync.cloud",
                    "backup.automatic",
                    "backup.manual",
                    "category.basic",
                    "tag.basic",
                    "tag.advanced",
                    "ui.theme_customization",
                    "ui.ad_free",
                    "ui.custom_fonts",
                    "support.community",
                    "support.email",
                ]
            },
            "enterprise": {
                "max_files": -1,  # -1 = 無制限
                "max_llm_requests": -1,
                "max_storage_mb": -1,
                "max_file_size_mb": 100,
                "features": ["*"]  # すべての機能
            }
        }

        # 高度なモデルのリスト（Pro以上が必要）
        self.advanced_models = [
            "gemini-2.5-pro",
            "gemini-1.5-pro",
        ]

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

    def get_plan_limits(self, tier: str) -> dict:
        """指定されたティアの制限値を取得する

        Args:
            tier: サブスクリプションティア（free, pro, enterprise）

        Returns:
            制限値の辞書
        """
        return self.subscription_tiers.get(tier, self.subscription_tiers["free"])

    def has_feature_access(self, tier: str, feature: str) -> bool:
        """指定されたティアが機能にアクセスできるかチェックする

        Args:
            tier: サブスクリプションティア
            feature: 機能キー（例: "llm.advanced_models"）

        Returns:
            アクセス可能な場合True
        """
        plan = self.subscription_tiers.get(tier, self.subscription_tiers["free"])
        features = plan["features"]

        # Enterpriseプランはすべての機能にアクセス可能
        if "*" in features:
            return True

        return feature in features

    def is_advanced_model(self, model: str) -> bool:
        """指定されたモデルが高度なモデルかチェックする

        Args:
            model: モデル名

        Returns:
            高度なモデルの場合True（Pro以上が必要）
        """
        return model in self.advanced_models

# 設定インスタンスを作成
settings = Settings()
