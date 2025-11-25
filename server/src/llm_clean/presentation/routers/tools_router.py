# @file tools_router.py
# @summary ツール定義を提供するAPIエンドポイントを定義します。
# @responsibility /api/toolsへのGETリクエストを処理し、利用可能なLLMツールの定義を返します。
from typing import Any

from fastapi import APIRouter

from src.core.logger import logger
from src.llm_clean.presentation.middleware.error_handler import handle_route_errors

from ...utils.tools import AVAILABLE_TOOLS

router = APIRouter()


@router.get("/api/tools")
@handle_route_errors
async def get_tools() -> list[dict]:
    """
    利用可能なLLMツールの定義を取得

    Returns:
        ツールのリスト。各ツールには以下の情報が含まれます:
        - name: ツール名
        - description: ツールの説明
        - args_schema: 引数のJSON Schema定義
    """
    tools_definition = []

    for tool in AVAILABLE_TOOLS:
        # 基本情報を取得
        tool_info: dict[str, Any] = {
            "name": tool.name,
            "description": tool.description or "",
        }

        # args_schemaが存在する場合、JSON Schemaに変換
        if tool.args_schema:
            try:
                # Pydantic v2のmodel_json_schema()を使用
                if hasattr(tool.args_schema, 'model_json_schema'):
                    schema = tool.args_schema.model_json_schema()  # type: ignore
                    tool_info["args_schema"] = schema
                # Pydantic v1の場合のフォールバック
                elif hasattr(tool.args_schema, 'schema'):
                    schema = tool.args_schema.schema()  # type: ignore
                    tool_info["args_schema"] = schema
                else:
                    # スキーマメソッドがない場合は空のスキーマを設定
                    tool_info["args_schema"] = {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
            except Exception as e:
                logger.error(f"Error converting schema for tool {tool.name}: {str(e)}", extra={"category": "api"})
                tool_info["args_schema"] = {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
        else:
            # スキーマがない場合は空のオブジェクトスキーマを設定
            tool_info["args_schema"] = {
                "type": "object",
                "properties": {},
                "required": []
            }

        tools_definition.append(tool_info)

    logger.info(f"Returning {len(tools_definition)} tool definitions", extra={"category": "api"})
    return tools_definition
