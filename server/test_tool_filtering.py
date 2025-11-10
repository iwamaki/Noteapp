#!/usr/bin/env python3
"""
ツールフィルタリング機能のテストスクリプト

このスクリプトは、TOOLS_ENABLED設定に基づいて
正しくツールがフィルタリングされているかを確認します。
"""

import sys
sys.path.insert(0, 'src')

from src.llm.providers.config import TOOLS_ENABLED
from src.llm.tools import get_enabled_tools, ALL_TOOLS

def test_tool_filtering():
    """ツールフィルタリングのテスト"""
    print("=" * 60)
    print("Tool Filtering Test")
    print("=" * 60)

    print("\n📋 All Available Tools:")
    print(f"Total: {len(ALL_TOOLS)} tools")
    for tool_name in ALL_TOOLS.keys():
        print(f"  - {tool_name}")

    print("\n⚙️  Tool Enable/Disable Settings (TOOLS_ENABLED):")
    enabled_count = sum(1 for enabled in TOOLS_ENABLED.values() if enabled)
    disabled_count = len(TOOLS_ENABLED) - enabled_count
    print(f"Enabled: {enabled_count}, Disabled: {disabled_count}")

    for tool_name, enabled in TOOLS_ENABLED.items():
        status = "✅ Enabled" if enabled else "❌ Disabled"
        print(f"  {status}: {tool_name}")

    print("\n🔧 Filtered Tools (get_enabled_tools):")
    enabled_tools = get_enabled_tools()
    print(f"Total: {len(enabled_tools)} tools")

    for tool in enabled_tools:
        print(f"  ✅ {tool.name}")

    print("\n✅ Test Result:")
    expected_count = sum(1 for enabled in TOOLS_ENABLED.values() if enabled)
    actual_count = len(enabled_tools)

    if expected_count == actual_count:
        print(f"✅ SUCCESS: Expected {expected_count} tools, got {actual_count} tools")
        return True
    else:
        print(f"❌ FAILED: Expected {expected_count} tools, got {actual_count} tools")
        return False

if __name__ == "__main__":
    success = test_tool_filtering()
    sys.exit(0 if success else 1)
