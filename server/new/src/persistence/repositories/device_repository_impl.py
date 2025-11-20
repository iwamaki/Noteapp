"""
@file device_repository_impl.py
@summary DeviceRepository実装 - DeviceModelのCRUD操作
@responsibility SQLAlchemyを使用したデバイスデータの永続化
"""


from sqlalchemy.orm import Session

from src.domain.auth.entities.device import Device
from src.domain.auth.repositories.device_repository import DeviceRepository
from src.persistence.models.auth import DeviceModel


class DeviceRepositoryImpl(DeviceRepository):
    """デバイスリポジトリ実装

    SQLAlchemyを使用してDeviceエンティティの永続化を行う。
    """

    def __init__(self, db: Session):
        """初期化

        Args:
            db: SQLAlchemyセッション
        """
        self.db = db

    async def find_by_device_id(self, device_id: str) -> Device | None:
        """デバイスIDでデバイスを取得

        Args:
            device_id: デバイスID

        Returns:
            Optional[Device]: デバイスエンティティ、存在しない場合はNone
        """
        model = self.db.query(DeviceModel).filter_by(device_id=device_id).first()

        if not model:
            return None

        return self._to_entity(model)

    async def find_all_by_user_id(self, user_id: str) -> list[Device]:
        """ユーザーIDで全デバイスを取得

        Args:
            user_id: ユーザーID

        Returns:
            List[Device]: デバイスエンティティのリスト
        """
        models = self.db.query(DeviceModel).filter_by(user_id=user_id).all()

        return [self._to_entity(model) for model in models]

    async def find_active_by_user_id(self, user_id: str) -> list[Device]:
        """ユーザーIDでアクティブなデバイスを取得

        Args:
            user_id: ユーザーID

        Returns:
            List[Device]: アクティブなデバイスエンティティのリスト
        """
        models = (
            self.db.query(DeviceModel)
            .filter_by(user_id=user_id, is_active=True)
            .all()
        )

        return [self._to_entity(model) for model in models]

    async def exists_by_device_id(self, device_id: str) -> bool:
        """デバイスIDでデバイスの存在をチェック

        Args:
            device_id: デバイスID

        Returns:
            bool: 存在する場合True
        """
        exists = (
            self.db.query(DeviceModel.id)
            .filter_by(device_id=device_id)
            .first()
            is not None
        )
        return exists

    async def save(self, device: Device) -> Device:
        """デバイスを保存（新規作成または更新）

        Args:
            device: デバイスエンティティ

        Returns:
            Device: 保存されたデバイスエンティティ（idが設定される）
        """
        if device.id:
            # 更新
            model = self.db.query(DeviceModel).filter_by(id=device.id).first()
            if not model:
                raise ValueError(f"Device with id {device.id} not found for update")

            # エンティティの値でモデルを更新
            model.device_id = device.device_id
            model.user_id = device.user_id
            model.device_name = device.device_name
            model.device_type = device.device_type
            model.is_active = device.is_active
            model.created_at = device.created_at
            model.last_login_at = device.last_login_at

        else:
            # 新規作成
            model = self._to_model(device)
            self.db.add(model)

        self.db.commit()
        self.db.refresh(model)

        return self._to_entity(model)

    async def delete(self, device: Device) -> None:
        """デバイスを削除

        Args:
            device: デバイスエンティティ
        """
        if not device.id:
            raise ValueError("Cannot delete device without id")

        model = self.db.query(DeviceModel).filter_by(id=device.id).first()
        if model:
            self.db.delete(model)
            self.db.commit()

    async def count_by_user_id(self, user_id: str) -> int:
        """ユーザーのデバイス数を取得

        Args:
            user_id: ユーザーID

        Returns:
            int: デバイス数
        """
        return self.db.query(DeviceModel).filter_by(user_id=user_id).count()

    def _to_entity(self, model: DeviceModel) -> Device:
        """ORMモデルをエンティティに変換

        Args:
            model: DeviceModel

        Returns:
            Device: Deviceエンティティ
        """
        return Device(
            id=model.id,
            device_id=model.device_id,
            user_id=model.user_id,
            device_name=model.device_name,
            device_type=model.device_type,
            is_active=model.is_active,
            created_at=model.created_at,
            last_login_at=model.last_login_at
        )

    def _to_model(self, entity: Device) -> DeviceModel:
        """エンティティをORMモデルに変換

        Args:
            entity: Deviceエンティティ

        Returns:
            DeviceModel: DeviceModel
        """
        return DeviceModel(
            id=entity.id,
            device_id=entity.device_id,
            user_id=entity.user_id,
            device_name=entity.device_name,
            device_type=entity.device_type,
            is_active=entity.is_active,
            created_at=entity.created_at,
            last_login_at=entity.last_login_at
        )
