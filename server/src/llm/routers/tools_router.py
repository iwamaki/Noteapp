# @file tools_router.py
# @summary ツール定義を提供するAPIエンドポイントを定義します。
# @responsibility /api/toolsへのGETリクエストを処理し、利用可能なLLMツールの定義を返します。
from fastapi import APIRouter, HTTPException
from src.llm.tools import AVAILABLE_TOOLS
from src.core.logger import logger
from typing import List, Dict, Any

router = APIRouter()

@router.get("/api/tools")
async def get_tools() -> List[Dict[str, Any]]:
    """
    利用可能なLLMツールの定義を取得

    Returns:
        ツールのリスト。各ツールには以下の情報が含まれます:
        - name: ツール名
        - description: ツールの説明
        - args_schema: 引数のJSON Schema定義
    """
    try:
        tools_definition = []

        for tool in AVAILABLE_TOOLS:
            # 基本情報を取得
            tool_info: Dict[str, Any] = {
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
                    logger.error(f"Error converting schema for tool {tool.name}: {str(e)}")
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

        logger.info(f"Returning {len(tools_definition)} tool definitions")
        return tools_definition

    except Exception as e:
        logger.error(f"Error getting tools: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tools: {str(e)}")
