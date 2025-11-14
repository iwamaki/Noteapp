
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
        self.openai_api_key: str | None = None

        # ========================================
        # LLMプロバイダー設定
        # ========================================
        # プロバイダー設定は src/llm/providers/registry.py で一元管理
        # ここではデフォルトプロバイダーのみを指定
        self.default_llm_provider: str = "gemini"

        # ========================================
        # モデルメタデータ（基本情報 + 価格情報）
        # ========================================
        # メタデータは初期化後に構築される（循環依存回避）
        self.model_metadata: dict[str, dict] = {}
        self._metadata_initialized = False

        # ========================================
        # APIキーの読み込み（Secret Manager → 環境変数の順）
        # ========================================
        gcp_project_id = os.getenv("GCP_PROJECT_ID")
        gemini_secret_id = os.getenv("GEMINI_API_SECRET_ID", "GOOGLE_API_KEY")
        openai_secret_id = os.getenv("OPENAI_API_SECRET_ID", "OPENAI_API_KEY")

        # Secret Manager から API キーを取得（必須）
        if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            raise ValueError(
                "GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. "
                "Please set the path to your service account key file."
            )

        if not gcp_project_id:
            raise ValueError(
                "GCP_PROJECT_ID environment variable is not set. "
                "Please set your GCP project ID."
            )

        try:
            client = secretmanager.SecretManagerServiceClient()

            # Gemini API キーの取得
            if gemini_secret_id:
                self.gemini_api_key = self._get_secret(client, gcp_project_id, gemini_secret_id)
                if not self.gemini_api_key:
                    raise ValueError(
                        f"GEMINI_API_KEY not found in Secret Manager. "
                        f"Please check secret '{gemini_secret_id}' in project '{gcp_project_id}'"
                    )

            # OpenAI API キーの取得（オプション）
            if openai_secret_id:
                self.openai_api_key = self._get_secret(client, gcp_project_id, openai_secret_id)
                # OpenAI はオプションなので、エラーにはしない
                if not self.openai_api_key:
                    logger.warning(
                        f"OPENAI_API_KEY not found in Secret Manager. "
                        f"OpenAI provider will not be available."
                    )
        except exceptions.PermissionDenied as e:
            raise ValueError(
                f"Permission denied accessing Secret Manager: {e}. "
                "Please ensure your service account has the 'Secret Manager Secret Accessor' role."
            ) from e
        except Exception as e:
            raise ValueError(f"Failed to initialize API keys from Secret Manager: {e}") from e

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

    def _ensure_metadata_initialized(self):
        """メタデータが初期化されていることを保証する（遅延初期化）

        循環依存を回避するため、メタデータは初回アクセス時に構築される。
        """
        if self._metadata_initialized:
            return

        # 遅延インポート（循環依存回避）
        from .pricing_config import MODEL_PRICING
        from src.llm.providers.registry import _get_registry

        # すべてのプロバイダーのモデルをループ
        for provider_name, provider_config in _get_registry().items():
            for model_id, model_meta in provider_config.models.items():
                # registry から基本メタデータを取得
                metadata = {
                    "category": model_meta.category,
                    "displayName": model_meta.display_name,
                    "description": model_meta.description,
                    "recommended": model_meta.recommended,
                }

                # 価格情報を追加
                pricing_info = MODEL_PRICING.get(model_id)
                if pricing_info:
                    metadata["pricing"] = {
                        "cost": {
                            "inputPricePer1M": pricing_info.cost.input_price_per_1m,
                            "outputPricePer1M": pricing_info.cost.output_price_per_1m,
                        },
                        "sellingPriceJPY": pricing_info.selling_price_jpy,
                    }

                self.model_metadata[model_id] = metadata

        self._metadata_initialized = True

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
        from src.llm.providers.registry import get_provider_config

        if provider is None:
            provider = self.default_llm_provider

        config = get_provider_config(provider)
        if config:
            return config.default_model

        # フォールバック: 指定されたプロバイダーが見つからない場合は
        # デフォルトプロバイダーのデフォルトモデルを返す
        default_config = get_provider_config(self.default_llm_provider)
        return default_config.default_model if default_config else "gemini-2.5-flash"

# 設定インスタンスを作成
settings = Settings()
