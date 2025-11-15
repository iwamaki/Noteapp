#!/usr/bin/env python3
"""
IAP検証ロジックのテストスクリプト

モックデータを使用してレシート検証のエンドポイントをテストします。
"""

import requests
import json

BASE_URL = "http://localhost:8000"
DEVICE_ID = "3591b4d1-9ac3-4a23-8960-6a037d788ec1"

# テスト用のモックデータ
MOCK_PURCHASE_VALID = {
    "productId": "token_300",
    "purchaseToken": "mock_valid_token_123456789",
    "transactionId": "GPA.1234-5678-9012-34567"
}

MOCK_PURCHASE_DUPLICATE = {
    "productId": "token_300",
    "purchaseToken": "mock_valid_token_duplicate",
    "transactionId": "GPA.1234-5678-9012-34567"  # 同じtransaction_id
}

MOCK_PURCHASE_INVALID = {
    "productId": "token_300",
    "purchaseToken": "invalid_token",
    "transactionId": "GPA.9999-9999-9999-99999"
}


def test_add_credits(purchase_record: dict, credits: int = 300, description: str = ""):
    """
    /api/billing/credits/add エンドポイントをテスト
    """
    print(f"\n{'='*60}")
    print(f"テスト: {description}")
    print(f"{'='*60}")

    url = f"{BASE_URL}/api/billing/credits/add"
    headers = {
        "Content-Type": "application/json",
        "X-Device-ID": DEVICE_ID
    }
    payload = {
        "credits": credits,
        "purchase_record": purchase_record
    }

    print(f"リクエスト: POST {url}")
    print(f"ヘッダー: {json.dumps(headers, indent=2)}")
    print(f"ボディ: {json.dumps(payload, indent=2)}")

    try:
        response = requests.post(url, headers=headers, json=payload)

        print("\nレスポンス:")
        print(f"ステータスコード: {response.status_code}")
        print(f"ボディ: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

        return response

    except Exception as e:
        print(f"\nエラー: {e}")
        return None


def test_get_balance():
    """
    残高を取得
    """
    print(f"\n{'='*60}")
    print("残高確認")
    print(f"{'='*60}")

    url = f"{BASE_URL}/api/billing/balance"
    headers = {
        "X-Device-ID": DEVICE_ID
    }

    try:
        response = requests.get(url, headers=headers)
        print(f"ステータスコード: {response.status_code}")
        print(f"残高: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
        return response
    except Exception as e:
        print(f"エラー: {e}")
        return None


def main():
    print("="*60)
    print("IAP レシート検証テスト")
    print("="*60)

    # 初期残高確認
    print("\n【事前確認】初期残高")
    test_get_balance()

    # テスト1: 正常な購入（モックデータなので検証失敗が期待される）
    print("\n【テスト1】正常な購入リクエスト（検証はGoogle APIで失敗するはず）")
    test_add_credits(
        MOCK_PURCHASE_VALID,
        credits=300,
        description="正常な購入トークン（ただしGoogle API検証で失敗）"
    )

    # テスト2: 不正なトークン
    print("\n【テスト2】不正な購入トークン")
    test_add_credits(
        MOCK_PURCHASE_INVALID,
        credits=300,
        description="明らかに不正なトークン"
    )

    # テスト3: productIdまたはpurchaseTokenが欠けている
    print("\n【テスト3】必須フィールド欠落")
    test_add_credits(
        {"transactionId": "GPA.0000-0000-0000-00000"},
        credits=300,
        description="productIdとpurchaseTokenが欠落"
    )

    # 最終残高確認
    print("\n【事後確認】最終残高")
    test_get_balance()

    print("\n" + "="*60)
    print("テスト完了")
    print("="*60)
    print("\n【期待される結果】")
    print("- すべてのテストで400または401エラーが返る（Google API検証で失敗するため）")
    print("- エラーメッセージに 'Invalid purchase receipt' が含まれる")
    print("- 残高は変化しない（不正な購入は受け付けない）")
    print("\n【実際の購入での動作】")
    print("- 本物の購入トークンの場合、Google Play APIで検証が成功")
    print("- 検証成功時のみクレジットが追加される")


if __name__ == "__main__":
    main()
