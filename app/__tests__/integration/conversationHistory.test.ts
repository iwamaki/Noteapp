import { LLMService } from '../../services/llmService';

describe('Conversation History Integration', () => {
  let llmService: LLMService;

  beforeEach(() => {
    llmService = new LLMService({
      baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',

    });
  });

  it('should maintain conversation context across multiple messages', async () => {
    // 1回目のメッセージ
    const response1 = await llmService.sendChatMessage('私の名前はタロウです');
    console.log('Response 1:', response1); // ログ追加
    expect(response1.message).toBeDefined();

    // 2回目のメッセージ（履歴を踏まえた質問）
    const response2 = await llmService.sendChatMessage('私の名前は何ですか？');
    console.log('Response 2:', response2); // ログ追加
    
    // AIが履歴を踏まえて返答することを確認
    expect(response2.message.toLowerCase()).toMatch(/タロウ|taro/i);
    expect(response2.historyCount).toBeGreaterThanOrEqual(2);
  }, 30000); // タイムアウトを30秒に設定

  it('should clear history when requested', async () => {
    await llmService.sendChatMessage('私の名前はタロウです');
    
    // 履歴をクリア
    llmService.clearHistory();
    
    const response = await llmService.sendChatMessage('私の名前は何ですか？');
    console.log('Response after clear:', response); // ログ追加
    
    // 履歴がないため、名前を覚えていないはず
    expect(response.message).not.toMatch(/タロウ|taro/i);
  }, 30000);
});