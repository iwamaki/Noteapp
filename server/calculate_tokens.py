#!/usr/bin/env python3
"""Calculate token counts for system prompt, message, and tools"""

import sys
sys.path.insert(0, '/app/src')

from src.core.config import settings
from src.llm_clean.infrastructure.token_counting import get_token_counter_factory
from src.llm_clean.utils.tools import AVAILABLE_TOOLS

# TokenCounterFactoryを使用してtoken_counterを取得
factory = get_token_counter_factory()
token_counter = factory.create_token_counter(
    provider="gemini",
    api_key=settings.gemini_api_key,
    model=settings.get_default_model("gemini")
)

# 1. System prompt
system_prompt = """あなたは親切で有能なAIアシスタントです。ユーザーのノート作成と編集をサポートします。
利用可能なツールを使って、ユーザーの要求に応えてください。
ファイルはtitle（ファイル名）で識別します。ファイルはフラット構造で管理されており、ディレクトリやパスの概念はありません。カテゴリーやタグで分類されています。"""

system_tokens = token_counter.count_tokens(system_prompt)
print(f"System prompt tokens: {system_tokens}")

# 2. User message
message = "こんにちは"
message_tokens = token_counter.count_tokens(message)
print(f"Message tokens: {message_tokens}")

# 3. Tools (as they appear in Claude API request)
tools_text_parts = []
for tool in AVAILABLE_TOOLS:
    # Format similar to how it's sent to Claude API
    tool_text = f"Tool: {tool.name}\nDescription: {tool.description}"
    if hasattr(tool, 'args_schema') and tool.args_schema:
        try:
            if hasattr(tool.args_schema, 'schema'):
                schema = tool.args_schema.schema()
                tool_text += f"\nArguments: {schema.get('properties', {})}"
        except Exception:
            pass
    tools_text_parts.append(tool_text)

tools_text = "\n\n".join(tools_text_parts)
tools_tokens = token_counter.count_tokens(tools_text)
print(f"Tools tokens (estimated): {tools_tokens}")
print(f"Number of tools: {len(AVAILABLE_TOOLS)}")

# 4. Total
total_estimated = system_tokens + message_tokens + tools_tokens
print(f"\nTotal estimated: {total_estimated}")
print(f"Claude reported: 9217")
print(f"Difference: {9217 - total_estimated}")

# Also print each tool's description length
print("\n--- Tool Details ---")
for tool in AVAILABLE_TOOLS:
    desc_tokens = token_counter.count_tokens(tool.description)
    print(f"{tool.name}: {desc_tokens} tokens")
