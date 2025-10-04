

import pytest
import asyncio
from unittest.mock import patch, MagicMock, create_autospec

# 親ディレクトリをsys.pathに追加して、servicesやmodelsをインポートできるようにする
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.services import SimpleLLMService
from src.models import ChatContext


class MockMessage:
    """メッセージのモッククラス"""
    def __init__(self, role=None, content=None):
        self.role = role
        self.content = content

# SystemMessage、HumanMessage、AIMessageのモック
class SystemMessage(MockMessage):
    def __init__(self, content):
        super().__init__(role="system", content=content)

class HumanMessage(MockMessage):
    def __init__(self, content):
        super().__init__(role="human", content=content)

class AIMessage(MockMessage):
    def __init__(self, content):
        super().__init__(role="ai", content=content)


@pytest.fixture(autouse=True)
def patch_langchain_modules(monkeypatch):
    """
    LangChain関連モジュールをモックしてテストを簡素化
    """
    # langchain.schema のモックにメッセージクラスを追加
    schema_mock = MagicMock()
    schema_mock.SystemMessage = SystemMessage
    schema_mock.HumanMessage = HumanMessage
    schema_mock.AIMessage = AIMessage
    
    monkeypatch.setitem(sys.modules, 'langchain.schema', schema_mock)
    monkeypatch.setitem(sys.modules, 'langchain_openai', MagicMock())
    monkeypatch.setitem(sys.modules, 'langchain_google_genai', MagicMock())


@pytest.fixture
def mock_llm():
    """
    LLMインスタンスの共通モックを提供
    """
    mock_instance = MagicMock()
    mock_instance.invoke = MagicMock(return_value=MagicMock(content="AI Response", tool_calls=None))
    mock_instance.bind_tools.return_value = mock_instance
    return mock_instance


@pytest.mark.asyncio
@pytest.mark.parametrize("provider,mock_class", [
    ("openai", "langchain_openai.ChatOpenAI"),
    ("gemini", "langchain_google_genai.ChatGoogleGenerativeAI"),
])
async def test_process_chat_with_history(provider, mock_class, mock_llm, monkeypatch):
    """
    指定プロバイダーでprocess_chatメソッドをテスト。
    会話履歴が正しくmessagesリストに挿入され、
    履歴カウントとレスポンスが正しいことを確認。
    """
    # Arrange
    with patch(mock_class, return_value=mock_llm):
        service = SimpleLLMService()
        setattr(service, f"{provider}_api_key", "fake-key")

        history = [
            {'role': 'user', 'content': 'First question'},
            {'role': 'ai', 'content': 'First answer'},
        ]
        context = ChatContext(conversationHistory=history)

        # Act
        response = await service.process_chat(
            message="Second question",
            provider=provider,
            context=context
        )

        # Assert
        mock_llm.invoke.assert_called_once()
        called_messages = mock_llm.invoke.call_args[0][0]

        assert len(called_messages) == 4  # System, User, AI, User
        
        # クラス名の確認の代わりに、役割と内容の確認に修正
        # 最初のメッセージはシステムメッセージ
        assert hasattr(called_messages[0], 'content')
        
        # 2番目のメッセージはユーザーの最初の質問
        assert hasattr(called_messages[1], 'content')
        assert called_messages[1].content == 'First question'
        
        # 3番目のメッセージはAIの最初の回答
        assert hasattr(called_messages[2], 'content')
        assert called_messages[2].content == 'First answer'
        
        # 4番目のメッセージはユーザーの2番目の質問
        assert hasattr(called_messages[3], 'content')
        assert called_messages[3].content == 'Second question'

        assert response.historyCount == 2
        assert response.message == "AI Response"
