#!/usr/bin/env python3
"""
認証検証エンドポイントのテストスクリプト

新しく実装した /api/auth/verify エンドポイントをテストします。
"""

import requests
import json

BASE_URL = "http://localhost:8000"

# 既存のデバイスID（DBに登録済み）
EXISTING_DEVICE_ID = "3591b4d1-9ac3-4a23-8960-6a037d788ec1"
# このデバイスに紐付いている正しいuser_id
CORRECT_USER_ID = "user_ljoimkn2j"
# 古い/間違ったuser_id（AsyncStorageに残留していたもの）
WRONG_USER_ID = "user_and6hmypg"


def test_verify_correct_user_id():
    """正しいuser_idでの検証テスト"""
    print("\n" + "="*60)
    print("テスト1: 正しいuser_idでの検証")
    print("="*60)

    url = f"{BASE_URL}/api/auth/verify"
    payload = {
        "device_id": EXISTING_DEVICE_ID,
        "user_id": CORRECT_USER_ID
    }

    print(f"リクエスト: POST {url}")
    print(f"ボディ: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(url, json=payload)
        print("\nレスポンス:")
        print(f"ステータスコード: {response.status_code}")
        print(f"ボディ: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

        data = response.json()
        assert data["valid"] is True, "正しいuser_idなのでvalid=Trueが期待される"
        assert data["user_id"] == CORRECT_USER_ID, "正しいuser_idが返されるべき"
        print("\n✅ テスト成功: 正しいuser_idが検証された")

    except Exception as e:
        print(f"\n❌ テスト失敗: {e}")


def test_verify_wrong_user_id():
    """間違ったuser_idでの検証テスト"""
    print("\n" + "="*60)
    print("テスト2: 間違ったuser_idでの検証")
    print("="*60)

    url = f"{BASE_URL}/api/auth/verify"
    payload = {
        "device_id": EXISTING_DEVICE_ID,
        "user_id": WRONG_USER_ID
    }

    print(f"リクエスト: POST {url}")
    print(f"ボディ: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(url, json=payload)
        print("\nレスポンス:")
        print(f"ステータスコード: {response.status_code}")
        print(f"ボディ: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

        data = response.json()
        assert data["valid"] is False, "間違ったuser_idなのでvalid=Falseが期待される"
        assert data["user_id"] == CORRECT_USER_ID, "正しいuser_idが返されるべき"
        print(f"\n✅ テスト成功: 不一致が検出され、正しいuser_id ({CORRECT_USER_ID}) が返された")

    except Exception as e:
        print(f"\n❌ テスト失敗: {e}")


def test_verify_unregistered_device():
    """未登録デバイスでの検証テスト"""
    print("\n" + "="*60)
    print("テスト3: 未登録デバイスでの検証")
    print("="*60)

    url = f"{BASE_URL}/api/auth/verify"
    unregistered_device = "99999999-9999-9999-9999-999999999999"
    payload = {
        "device_id": unregistered_device,
        "user_id": "user_test123"
    }

    print(f"リクエスト: POST {url}")
    print(f"ボディ: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(url, json=payload)
        print("\nレスポンス:")
        print(f"ステータスコード: {response.status_code}")
        print(f"ボディ: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

        assert response.status_code == 404, "未登録デバイスは404エラーが期待される"
        print("\n✅ テスト成功: 未登録デバイスは404エラーを返した")

    except Exception as e:
        print(f"\n❌ テスト失敗: {e}")


def main():
    print("="*60)
    print("認証検証エンドポイント テスト")
    print("="*60)

    test_verify_correct_user_id()
    test_verify_wrong_user_id()
    test_verify_unregistered_device()

    print("\n" + "="*60)
    print("全テスト完了")
    print("="*60)
    print("\n【検証内容】")
    print("1. 正しいdevice_id + user_id → valid=True")
    print("2. 正しいdevice_id + 間違ったuser_id → valid=False、正しいuser_idを返す")
    print("3. 未登録device_id → 404エラー")


if __name__ == "__main__":
    main()
