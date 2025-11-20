"""
@file secrets.py
@summary Secret Manager統合
@responsibility GCP Secret Managerからシークレットを取得する機能を提供
"""


from google.api_core import exceptions
from google.cloud import secretmanager


class SecretManagerClient:
    """GCP Secret Managerクライアント

    Google Cloud Secret Managerからシークレットを安全に取得する。
    """

    def __init__(self, project_id: str):
        """
        Args:
            project_id: GCPプロジェクトID
        """
        self.project_id = project_id
        self._client: secretmanager.SecretManagerServiceClient | None = None

    @property
    def client(self) -> secretmanager.SecretManagerServiceClient:
        """Secret Managerクライアントを取得（遅延初期化）"""
        if self._client is None:
            self._client = secretmanager.SecretManagerServiceClient()
        return self._client

    def get_secret(self, secret_id: str, version: str = "latest") -> str | None:
        """Secret Managerからシークレットを取得

        Args:
            secret_id: シークレットID
            version: バージョン（デフォルト: latest）

        Returns:
            シークレット値（取得失敗時はNone）
        """
        secret_name = f"projects/{self.project_id}/secrets/{secret_id}/versions/{version}"

        try:
            response = self.client.access_secret_version(request={"name": secret_name})
            return response.payload.data.decode("UTF-8").strip()
        except exceptions.NotFound:
            # シークレットが見つからない場合
            return None
        except exceptions.PermissionDenied as e:
            # 権限エラー
            raise ValueError(
                f"Permission denied accessing Secret Manager: {e}. "
                "Please ensure your service account has the 'Secret Manager Secret Accessor' role."
            ) from e
        except Exception as e:
            # その他のエラー
            raise ValueError(
                f"Failed to access secret '{secret_id}': {e}"
            ) from e

    def get_secret_or_raise(self, secret_id: str, version: str = "latest") -> str:
        """Secret Managerからシークレットを取得（必須）

        Args:
            secret_id: シークレットID
            version: バージョン（デフォルト: latest）

        Returns:
            シークレット値

        Raises:
            ValueError: シークレットが見つからない場合
        """
        secret = self.get_secret(secret_id, version)
        if secret is None:
            raise ValueError(
                f"Secret '{secret_id}' not found in project '{self.project_id}'. "
                f"Please check that the secret exists and is accessible."
            )
        return secret


# ==========================================
# グローバルSecret Managerクライアント（後で初期化）
# ==========================================
_secret_manager_client: SecretManagerClient | None = None


def init_secret_manager(project_id: str) -> SecretManagerClient:
    """Secret Managerクライアントを初期化

    Args:
        project_id: GCPプロジェクトID

    Returns:
        SecretManagerClient: 初期化されたクライアント
    """
    global _secret_manager_client
    _secret_manager_client = SecretManagerClient(project_id)
    return _secret_manager_client


def get_secret_manager() -> SecretManagerClient:
    """Secret Managerクライアントを取得

    Returns:
        SecretManagerClient: Secret Managerクライアント

    Raises:
        RuntimeError: Secret Managerが初期化されていない場合
    """
    if _secret_manager_client is None:
        raise RuntimeError(
            "Secret Manager not initialized. Call init_secret_manager() first."
        )
    return _secret_manager_client
