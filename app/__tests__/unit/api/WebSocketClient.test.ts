/**
 * @file WebSocketClient.test.ts
 * @summary WebSocketClientのテスト
 *
 * @description
 * WebSocket切断時のログレベルが適切に設定されていることを保証する。
 *
 * @remarks
 * WebSocketの`onerror`イベントは、サーバーによる意図的な切断（stale connection等）でも
 * 発火するが、これは正常な動作である。すべてのエラーを`error`レベルでログすると、
 * error_logsテーブルが不要なログで埋まってしまう問題があった。
 *
 * @see {@link WebSocketClient} テスト対象のクラス
 *
 * @example 期待する動作
 * ```
 * | ケース                          | ログレベル | error_logs送信 |
 * |---------------------------------|------------|----------------|
 * | サーバー正常切断 (code=1000/1001) | warn       | No             |
 * | 異常終了 (code=1006/1011等)       | error      | Yes            |
 * | 意図的切断 (disconnect())         | info       | No             |
 * ```
 *
 * @example 再接続ロジック
 * ```
 * | code  | reason    | 再接続 |
 * |-------|-----------|--------|
 * | 1000  | あり      | Yes    |
 * | 1000  | なし      | No     |
 * | その他 | -        | Yes    |
 * ```
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

// loggerをモック
jest.mock('../../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// tokenServiceをモック
jest.mock('../../../features/auth/tokenService', () => ({
  getAccessToken: jest.fn().mockResolvedValue('mock-token'),
  saveTokens: jest.fn(),
  clearTokens: jest.fn(),
}));

// jwtUtilsをモック
jest.mock('../../../features/auth/jwtUtils', () => ({
  getJwtTimeToExpiry: jest.fn().mockReturnValue(300000), // 5分
}));

// WebSocketをモック
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  send = jest.fn();
  close = jest.fn();

  // テスト用ヘルパー: イベントを発火
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

// グローバルWebSocketをモック
let mockWsInstance: MockWebSocket;
(global as any).WebSocket = jest.fn().mockImplementation(() => {
  mockWsInstance = new MockWebSocket();
  return mockWsInstance;
});

describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new WebSocketClient('wss://test.example.com/ws', DEFAULT_WEBSOCKET_CONFIG, {}, 'test');
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('エラーハンドリングとログレベル', () => {
    beforeEach(() => {
      // 接続を開始
      client.connect();
      // auth_successをシミュレートして接続完了状態にする
      mockWsInstance.triggerOpen();
      mockWsInstance.triggerMessage({ type: 'auth_success' });
    });

    it('サーバーによる正常終了（code=1000）の場合、warnでログ出力する', () => {
      // onerrorが発火
      mockWsInstance.triggerError();

      // oncloseがcode=1000で発火
      mockWsInstance.triggerClose(1000, 'Stale connection');

      // warnが呼ばれていることを確認
      expect(logger.warn).toHaveBeenCalledWith(
        'test',
        'WebSocket closed by server: code=1000, reason=Stale connection'
      );
      // errorは呼ばれていないことを確認
      expect(logger.error).not.toHaveBeenCalledWith(
        'test',
        expect.stringContaining('WebSocket error:')
      );
    });

    it('サーバーによるGoing Away（code=1001）の場合、warnでログ出力する', () => {
      mockWsInstance.triggerError();
      mockWsInstance.triggerClose(1001, 'Server shutting down');

      expect(logger.warn).toHaveBeenCalledWith(
        'test',
        'WebSocket closed by server: code=1001, reason=Server shutting down'
      );
      expect(logger.error).not.toHaveBeenCalledWith(
        'test',
        expect.stringContaining('WebSocket error:')
      );
    });

    it('異常終了（code=1006）の場合、errorでログ出力する', () => {
      mockWsInstance.triggerError();
      mockWsInstance.triggerClose(1006, 'Abnormal closure');

      expect(logger.error).toHaveBeenCalledWith(
        'test',
        'WebSocket error: code=1006, reason=Abnormal closure'
      );
    });

    it('異常終了（code=1011）の場合、errorでログ出力する', () => {
      mockWsInstance.triggerError();
      mockWsInstance.triggerClose(1011, 'Internal server error');

      expect(logger.error).toHaveBeenCalledWith(
        'test',
        'WebSocket error: code=1011, reason=Internal server error'
      );
    });

    it('エラーなしで切断（意図的な切断）の場合、infoでログ出力する', () => {
      // onerrorなしでoncloseのみ発火
      mockWsInstance.triggerClose(1000, '');

      expect(logger.info).toHaveBeenCalledWith(
        'test',
        'WebSocket closed: code=1000, reason=none'
      );
      expect(logger.warn).not.toHaveBeenCalledWith(
        'test',
        expect.stringContaining('WebSocket closed by server')
      );
      expect(logger.error).not.toHaveBeenCalledWith(
        'test',
        expect.stringContaining('WebSocket error')
      );
    });

    it('reasonがない場合、"none"と表示する', () => {
      mockWsInstance.triggerError();
      mockWsInstance.triggerClose(1000);

      expect(logger.warn).toHaveBeenCalledWith(
        'test',
        'WebSocket closed by server: code=1000, reason=none'
      );
    });
  });

  describe('再接続ロジック', () => {
    beforeEach(() => {
      client.connect();
      mockWsInstance.triggerOpen();
      mockWsInstance.triggerMessage({ type: 'auth_success' });
    });

    it('正常終了（code=1000）でもreasonがあれば再接続する', () => {
      mockWsInstance.triggerClose(1000, 'Stale connection');

      // 再接続がスケジュールされていることを確認（infoログで確認）
      expect(logger.info).toHaveBeenCalledWith(
        'test',
        'Scheduling reconnection after close'
      );
    });

    it('正常終了（code=1000）でreasonがなければ再接続しない', () => {
      mockWsInstance.triggerClose(1000, '');

      expect(logger.info).toHaveBeenCalledWith(
        'test',
        'Not reconnecting (intentional disconnect)'
      );
    });
  });
});
