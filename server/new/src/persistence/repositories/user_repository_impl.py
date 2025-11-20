"""
@file user_repository_impl.py
@summary UserRepository実装 - UserModelのCRUD操作
@responsibility SQLAlchemyを使用したユーザーデータの永続化
"""


from sqlalchemy.orm import Session

from src.domain.auth.entities.user import User
from src.domain.auth.repositories.user_repository import UserRepository
from src.persistence.models.billing import UserModel


class UserRepositoryImpl(UserRepository):
    """ユーザーリポジトリ実装

    SQLAlchemyを使用してUserエンティティの永続化を行う。
    """

    def __init__(self, db: Session):
        """初期化

        Args:
            db: SQLAlchemyセッション
        """
        self.db = db

    async def find_by_id(self, user_id: str) -> User | None:
        """ユーザーIDでユーザーを取得

        Args:
            user_id: ユーザーID

        Returns:
            Optional[User]: ユーザーエンティティ、存在しない場合はNone
        """
        model = self.db.query(UserModel).filter_by(user_id=user_id).first()

        if not model:
            return None

        return self._to_entity(model)

    async def find_by_google_id(self, google_id: str) -> User | None:
        """Google IDでユーザーを取得

        Args:
            google_id: Google ID

        Returns:
            Optional[User]: ユーザーエンティティ、存在しない場合はNone
        """
        model = self.db.query(UserModel).filter_by(google_id=google_id).first()

        if not model:
            return None

        return self._to_entity(model)

    async def find_by_email(self, email: str) -> User | None:
        """メールアドレスでユーザーを取得

        Args:
            email: メールアドレス

        Returns:
            Optional[User]: ユーザーエンティティ、存在しない場合はNone
        """
        model = self.db.query(UserModel).filter_by(email=email).first()

        if not model:
            return None

        return self._to_entity(model)

    async def exists_by_user_id(self, user_id: str) -> bool:
        """ユーザーIDでユーザーの存在をチェック

        Args:
            user_id: ユーザーID

        Returns:
            bool: 存在する場合True
        """
        exists = (
            self.db.query(UserModel.id)
            .filter_by(user_id=user_id)
            .first()
            is not None
        )
        return exists

    async def exists_by_google_id(self, google_id: str) -> bool:
        """Google IDでユーザーの存在をチェック

        Args:
            google_id: Google ID

        Returns:
            bool: 存在する場合True
        """
        exists = (
            self.db.query(UserModel.id)
            .filter_by(google_id=google_id)
            .first()
            is not None
        )
        return exists

    async def save(self, user: User) -> User:
        """ユーザーを保存（新規作成または更新）

        Args:
            user: ユーザーエンティティ

        Returns:
            User: 保存されたユーザーエンティティ（idが設定される）
        """
        if user.id:
            # 更新
            model = self.db.query(UserModel).filter_by(id=user.id).first()
            if not model:
                raise ValueError(f"User with id {user.id} not found for update")

            # エンティティの値でモデルを更新
            model.user_id = user.user_id
            model.google_id = user.google_id
            model.email = user.email
            model.display_name = user.display_name
            model.profile_picture_url = user.profile_picture_url
            model.created_at = user.created_at

        else:
            # 新規作成
            model = self._to_model(user)
            self.db.add(model)

        self.db.commit()
        self.db.refresh(model)

        return self._to_entity(model)

    async def delete(self, user: User) -> None:
        """ユーザーを削除

        Args:
            user: ユーザーエンティティ
        """
        if not user.id:
            raise ValueError("Cannot delete user without id")

        model = self.db.query(UserModel).filter_by(id=user.id).first()
        if model:
            self.db.delete(model)
            self.db.commit()

    async def count(self) -> int:
        """ユーザー総数を取得

        Returns:
            int: ユーザー総数
        """
        return self.db.query(UserModel).count()

    def _to_entity(self, model: UserModel) -> User:
        """ORMモデルをエンティティに変換

        Args:
            model: UserModel

        Returns:
            User: Userエンティティ
        """
        return User(
            id=model.id,
            user_id=model.user_id,
            created_at=model.created_at,
            google_id=model.google_id,
            email=model.email,
            display_name=model.display_name,
            profile_picture_url=model.profile_picture_url
        )

    def _to_model(self, entity: User) -> UserModel:
        """エンティティをORMモデルに変換

        Args:
            entity: Userエンティティ

        Returns:
            UserModel: UserModel
        """
        return UserModel(
            id=entity.id,
            user_id=entity.user_id,
            created_at=entity.created_at,
            google_id=entity.google_id,
            email=entity.email,
            display_name=entity.display_name,
            profile_picture_url=entity.profile_picture_url
        )
