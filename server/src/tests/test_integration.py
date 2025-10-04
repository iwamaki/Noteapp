import pytest
from src.services import SimpleLLMService
from src.models import ChatContext

@pytest.mark.integration
@pytest.mark.asyncio
async def test_llm_understands_conversation_context():
    """
    実際のLLMを使って会話履歴が文脈として機能するかをテスト
    """
    service = SimpleLLMService()
    
    # 1回目の質問
    context1 = ChatContext(conversationHistory=[])
    response1 = await service.process_chat(
        message="私の名前はタロウです",
        provider="openai",
        context=context1
    )
    
    # 2回目の質問（履歴を含む）
    history = [
        {'role': 'user', 'content': '私の名前はタロウです'},
        {'role': 'ai', 'content': response1.message}
    ]
    context2 = ChatContext(conversationHistory=history)
    response2 = await service.process_chat(
        message="私の名前は何ですか？",
        provider="openai",
        context=context2
    )
    
    # AIが「タロウ」と答えることを確認
    assert "タロウ" in response2.message.lower() or "taro" in response2.message.lower()
    assert response2.historyCount == 2