/**
 * @file WebSocketLogging.integration.test.ts
 * @summary WebSocket切断時のログ出力とバックエンド送信の統合テスト
 *
 * @description
 * WebSocketClient → Logger → ErrorLogService の連携を検証する。
 * 各切断シナリオで適切なログレベルが使用され、
 * error/warnのみがバックエンド（error_logsテーブル）に送信されることを保証する。
 *
 * @remarks
 * Unit testとの違い:
 * - Unit test: WebSocketClient単体のログ出力を検証（loggerをモック）
 * - Integration test: Logger + ErrorLogService連携を含めた検証
 *
 * @example バックエンド送信の期待動作
 * ```
 * | シナリオ                          | ログレベル | error_logs送信 |
 * |---------------------------------|------------|----------------|
 * | サーバー正常切断 (code=1000/1001) | warn       | Yes            |
 * | 異常終了 (code=1006/1011)         | error      | Yes            |
 * | 意図的切断 (disconnect())         | info       | No             |
 * ```
 *
 * @see {@link WebSocketClient} テスト対象の主要クラス
 * @see {@link Logger} ログ出力クラス
 */

import { WebSocketClient, DEFAULT_WEBSOCKET_CONFIG } from '../../../features/api/clients/WebSocketClient';
import { logger } from '../../../utils/logger';

// CloseEventのポリフィル（Node.js環境用）
class MockCloseEvent extends Event {
  code: number;
  reason: string;
  wasClean: boolean;

  constructor(type: string, init?: { code?: number; reason?: string; wasClean?: boolean }) {
    super(type);
    this.code = init?.code ?? 1000;
    this.reason = init?.reason ?? '';
    this.wasClean = init?.wasClean ?? true;
  }
}
(global as any).CloseEvent = MockCloseEvent;

// ErrorLogServiceのモック
const mockErrorLogService = {
  sendErrorLog: jest.fn().mockResolvedValue(undefined),
};

// tokenServiceをモック
jest.mock('../../../features/auth/tokenService', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  saveTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

// jwtUtilsをモック（テスト中にタイマーが発火しないよう十分長い時間を設定）
jest.mock('../../../features/auth/jwtUtils', () => ({
  getJwtTimeToExpiry: jest.fn().mockReturnValue(3600000), // 1時間
}));

// WebSocketをモック
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  send = jest.fn();
  close = jest.fn();

  triggerOpen() {
    this.onopen?.(new Event('open'));
  }

  triggerError() {
    this.onerror?.(new Event('error'));
  }

  triggerClose(code: number, reason: string = '') {
    const event = new CloseEvent('close', { code, reason });
    this.onclose?.(event);
  }

  triggerMessage(data: any) {
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    this.onmessage?.(event);
  }
}

let mockWsInstance: MockWebSocket;
(global as any).WebSocket = jest.fn().mockImplementation(() => {
  mockWsInstance = new MockWebSocket();
  return mockWsInstance;
});

describe('WebSocket + Logger + ErrorLogService 統合テスト', () => {
  let client: WebSocketClient;
  let consoleSpy: jest.SpyInstance;

  beforeAll(() => {
    // Loggerにモックサービスを設定
    logger.setErrorLogService(mockErrorLogService);
    logger.setSendToBackend(true);
    // テスト用にログレベルをdebugに設定
    logger.setLevel('debug');
    // フェイクタイマーを使用（ハートビート等の非同期処理を制御）
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    client = new WebSocketClient('wss://test.example.com/ws', DEFAULT_WEBSOCKET_CONFIG, {}, 'test');
  });

  afterEach(() => {
    client.disconnect();
    consoleSpy.mockRestore();
    // すべてのタイマーをクリア
    jest.clearAllTimers();
  });

  afterAll(() => {
    // テスト後にバックエンド送信を無効化
    logger.setSendToBackend(false);
    // リアルタイマーに戻す
    jest.useRealTimers();
  });

  /**
   * コンソール出力からログエントリを抽出
   */
  function getLogEntries(): Array<{ level: string; category: string; message: string }> {
    return consoleSpy.mock.calls
      .map(([jsonStr]) => {
        try {
          return JSON.parse(jsonStr);
        } catch {
          return null;
        }
      })
      .filter((entry): entry is { level: string; category: string; message: string } => entry !== null);
  }

  /**
   * 指定レベルのログが出力されたか確認
   */
  function hasLogWithLevel(level: string, messagePattern: RegExp): boolean {
    return getLogEntries().some(
      (entry) => entry.level === level && messagePattern.test(entry.message)
    );
  }

  describe('サーバー起因の切断とバックエンド送信', () => {
    beforeEach(() => {
      client.connect();
      mockWsInstance.triggerOpen();
      mockWsInstance.triggerMessage({ type: 'auth_success' });
      jest.clearAllMocks(); // 接続ログをクリア
    });

    it('code=1000（正常終了）でonerror発火時、warnレベルでバックエンドに送信される', () => {
      mockWsInstance.triggerError();
      mockWsInstance.triggerClose(1000, 'Stale connection');

      // warnレベルでログ出力されていることを確認
      expect(hasLogWithLevel('WARN', /WebSocket closed by server/)).toBe(true);

      // バックエンドにwarnとして送信されていることを確認
      expect(mockErrorLogService.sendErrorLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          category: 'test',
          message: expect.stringContaining('WebSocket closed by server'),
        })
      );
    });

    it('code=1001（Going Away）でonerror発火時、warnレベルでバックエンドに送信される', () => {
      mockWsInstance.triggerError();
      mockWsInstance.triggerClose(1001, 'Server shutting down');

      expect(hasLogWithLevel('WARN', /WebSocket closed by server/)).toBe(true);

      expect(mockErrorLogService.sendErrorLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          category: 'test',
          message: expect.stringContaining('code=1001'),
        })
      );
    });

    it('code=1006（異常終了）でonerror発火時、errorレベルでバックエンドに送信される', () => {
      mockWsInstance.triggerError();
      mockWsInstance.triggerClose(1006, 'Abnormal closure');

      expect(hasLogWithLevel('ERROR', /WebSocket error/)).toBe(true);

      expect(mockErrorLogService.sendErrorLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          category: 'test',
          message: expect.stringContaining('WebSocket error'),
        })
      );
    });

    it('code=1011（Internal Error）でonerror発火時、errorレベルでバックエンドに送信される', () => {
      mockWsInstance.triggerError();
      mockWsInstance.triggerClose(1011, 'Internal server error');

      expect(hasLogWithLevel('ERROR', /WebSocket error/)).toBe(true);

      expect(mockErrorLogService.sendErrorLog).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          category: 'test',
          message: expect.stringContaining('code=1011'),
        })
      );
    });
  });

  describe('クライアント起因の切断', () => {
    beforeEach(() => {
      client.connect();
      mockWsInstance.triggerOpen();
      mockWsInstance.triggerMessage({ type: 'auth_success' });
      jest.clearAllMocks();
    });

    it('意図的なdisconnect()の場合、infoレベルでバックエンドに送信されない', () => {
      // onerrorなしでoncloseのみ発火
      mockWsInstance.triggerClose(1000, '');

      expect(hasLogWithLevel('INFO', /WebSocket closed/)).toBe(true);
      expect(hasLogWithLevel('WARN', /WebSocket/)).toBe(false);
      expect(hasLogWithLevel('ERROR', /WebSocket/)).toBe(false);

      // infoレベルはバックエンドに送信されない
      expect(mockErrorLogService.sendErrorLog).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('WebSocket closed: code=1000'),
        })
      );
    });
  });

  describe('ログカテゴリの検証', () => {
    it('WebSocketClientのlogContextがログカテゴリとして使用される', () => {
      const customClient = new WebSocketClient(
        'wss://test.example.com/ws',
        DEFAULT_WEBSOCKET_CONFIG,
        {},
        'customCategory'
      );

      customClient.connect();
      mockWsInstance.triggerOpen();
      mockWsInstance.triggerMessage({ type: 'auth_success' });
      mockWsInstance.triggerError();
      mockWsInstance.triggerClose(1006, 'Test error');

      const entries = getLogEntries();
      const errorEntry = entries.find(
        (e) => e.level === 'ERROR' && e.message.includes('WebSocket error')
      );

      expect(errorEntry?.category).toBe('customCategory');

      customClient.disconnect();
    });
  });

  describe('再接続シナリオ', () => {
    beforeEach(() => {
      client.connect();
      mockWsInstance.triggerOpen();
      mockWsInstance.triggerMessage({ type: 'auth_success' });
      jest.clearAllMocks();
    });

    it('code=1000でreasonありの場合、再接続がスケジュールされる', () => {
      mockWsInstance.triggerClose(1000, 'Stale connection');

      expect(hasLogWithLevel('INFO', /Scheduling reconnection/)).toBe(true);
    });

    it('code=1000でreasonなしの場合、再接続されない', () => {
      mockWsInstance.triggerClose(1000, '');

      expect(hasLogWithLevel('INFO', /Not reconnecting/)).toBe(true);
    });

    it('code=1006の場合、再接続がスケジュールされる', () => {
      mockWsInstance.triggerError();
      mockWsInstance.triggerClose(1006, 'Abnormal closure');

      expect(hasLogWithLevel('INFO', /Scheduling reconnection/)).toBe(true);
    });
  });
});
