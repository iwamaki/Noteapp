#!/usr/bin/env python3
"""
レート制限テストスクリプト

/api/auth/register と /api/auth/verify のレート制限をテストします。
- /register: 10リクエスト/分
- /verify: 20リクエスト/分
"""

import requests
import time

# バックエンドURL（環境に応じて変更）
BASE_URL = "http://localhost:8000"


def test_register_rate_limit():
    """
    /api/auth/register のレート制限をテスト

    期待動作:
    - 1-10回目: 200 OK
    - 11回目: 429 Too Many Requests
    """
    print("\n" + "="*60)
    print("Testing /api/auth/register rate limit (10/minute)")
    print("="*60)

    endpoint = f"{BASE_URL}/api/auth/register"
    success_count = 0
    rate_limited = False

    for i in range(1, 13):  # 12回試行
        device_id = f"test-device-{i}-{int(time.time())}"
        payload = {"device_id": device_id}

        try:
            response = requests.post(endpoint, json=payload)
            status = response.status_code

            if status == 200:
                success_count += 1
                print(f"✅ Request {i:2d}: SUCCESS (200) - {response.json().get('message', '')}")
            elif status == 429:
                rate_limited = True
                print(f"🚫 Request {i:2d}: RATE LIMITED (429) - {response.json().get('detail', '')}")
            else:
                print(f"❌ Request {i:2d}: UNEXPECTED ({status}) - {response.text}")

        except requests.exceptions.ConnectionError:
            print(f"❌ Request {i:2d}: CONNECTION ERROR - Is the server running?")
            return False
        except Exception as e:
            print(f"❌ Request {i:2d}: ERROR - {e}")
            return False

    print("\n" + "-"*60)
    print("Summary:")
    print(f"  Successful requests: {success_count}")
    print(f"  Rate limited: {rate_limited}")

    # 検証
    if success_count == 10 and rate_limited:
        print("  ✅ PASS: Rate limiting is working correctly!")
        return True
    else:
        print("  ❌ FAIL: Expected 10 successful requests and rate limiting")
        return False


def test_verify_rate_limit():
    """
    /api/auth/verify のレート制限をテスト

    期待動作:
    - 1-20回目: 200 OK または 404 Not Found（デバイス未登録）
    - 21回目: 429 Too Many Requests
    """
    print("\n" + "="*60)
    print("Testing /api/auth/verify rate limit (20/minute)")
    print("="*60)

    endpoint = f"{BASE_URL}/api/auth/verify"
    success_or_not_found_count = 0
    rate_limited = False

    for i in range(1, 23):  # 22回試行
        device_id = f"test-device-{i}"
        user_id = f"test-user-{i}"
        payload = {
            "device_id": device_id,
            "user_id": user_id
        }

        try:
            response = requests.post(endpoint, json=payload)
            status = response.status_code

            if status in [200, 404]:  # 200 OK または 404 Not Found
                success_or_not_found_count += 1
                print(f"✅ Request {i:2d}: OK ({status})")
            elif status == 429:
                rate_limited = True
                print(f"🚫 Request {i:2d}: RATE LIMITED (429) - {response.json().get('detail', '')}")
            else:
                print(f"❌ Request {i:2d}: UNEXPECTED ({status}) - {response.text}")

        except requests.exceptions.ConnectionError:
            print(f"❌ Request {i:2d}: CONNECTION ERROR - Is the server running?")
            return False
        except Exception as e:
            print(f"❌ Request {i:2d}: ERROR - {e}")
            return False

    print("\n" + "-"*60)
    print("Summary:")
    print(f"  Successful/NotFound requests: {success_or_not_found_count}")
    print(f"  Rate limited: {rate_limited}")

    # 検証
    if success_or_not_found_count == 20 and rate_limited:
        print("  ✅ PASS: Rate limiting is working correctly!")
        return True
    else:
        print("  ❌ FAIL: Expected 20 successful requests and rate limiting")
        return False


def wait_for_rate_limit_reset():
    """
    レート制限がリセットされるまで待機（60秒）
    """
    print("\n" + "="*60)
    print("Waiting for rate limit to reset (60 seconds)...")
    print("="*60)

    for remaining in range(60, 0, -1):
        print(f"\rTime remaining: {remaining} seconds", end="", flush=True)
        time.sleep(1)
    print("\n")


def main():
    """
    メインテスト実行
    """
    print("\n" + "="*60)
    print("Rate Limiting Test Suite")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print("Test Plan:")
    print("  1. Test /api/auth/register (10/minute)")
    print("  2. Wait 60 seconds for rate limit reset")
    print("  3. Test /api/auth/verify (20/minute)")

    # Test 1: /register
    register_passed = test_register_rate_limit()

    # Wait for rate limit reset
    wait_for_rate_limit_reset()

    # Test 2: /verify
    verify_passed = test_verify_rate_limit()

    # Final summary
    print("\n" + "="*60)
    print("Final Test Results")
    print("="*60)
    print(f"/api/auth/register: {'✅ PASS' if register_passed else '❌ FAIL'}")
    print(f"/api/auth/verify:   {'✅ PASS' if verify_passed else '❌ FAIL'}")

    if register_passed and verify_passed:
        print("\n🎉 All tests passed! Rate limiting is working correctly.")
        return 0
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
        return 1


if __name__ == "__main__":
    exit(main())
