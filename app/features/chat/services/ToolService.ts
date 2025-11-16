/**
 * @file ToolService.ts
 * @summary ツール定義を管理するサービス
 * @responsibility サーバーから取得したツール定義を保持し、コマンドの検証機能を提供します
 */

import { createHttpClient, HttpClient } from '../../api';
import { logger } from '../../../utils/logger';
import { LLMCommand } from '../llmService/types/index';

/**
 * ツールのJSON Schema定義
 */
export interface ToolArgsSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

/**
 * ツール定義の型
 */
export interface ToolSchema {
  name: string;
  description: string;
  args_schema: ToolArgsSchema;
}

/**
 * ツール定義を管理するシングルトンサービス
 */
class ToolService {
  private static instance: ToolService | null = null;
  private tools: ToolSchema[] = [];
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private httpClient: HttpClient;

  private constructor() {
    // 共通HttpClientを初期化
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    this.httpClient = createHttpClient({
      baseUrl,
      timeout: 10000,
      includeAuth: true,
      logContext: 'toolService',
    });
  }

  /**
   * ToolServiceのインスタンスを取得
   */
  public static getInstance(): ToolService {
    if (!ToolService.instance) {
      ToolService.instance = new ToolService();
    }
    return ToolService.instance;
  }

  /**
   * サーバーからツール定義を取得して初期化
   */
  public async initialize(): Promise<void> {
    // 既に初期化済みの場合はスキップ
    if (this.isInitialized) {
      logger.debug('toolService', 'Already initialized, skipping');
      return;
    }

    // 初期化中の場合は既存のPromiseを返す
    if (this.initializationPromise) {
      logger.debug('toolService', 'Initialization in progress, waiting...');
      return this.initializationPromise;
    }

    // 初期化を開始
    this.initializationPromise = this.fetchTools();
    await this.initializationPromise;
    this.initializationPromise = null;
  }

  /**
   * サーバーからツール定義を取得
   */
  private async fetchTools(): Promise<void> {
    try {
      logger.debug('toolService', 'Fetching tool definitions from server...');

      // 共通HttpClientを使用
      const response = await this.httpClient.get<ToolSchema[]>('/api/tools');

      this.tools = response.data;
      this.isInitialized = true;

      logger.info('toolService', `Loaded ${this.tools.length} tool definitions:`,
        this.tools.map(t => t.name));

    } catch (error) {
      logger.error('toolService', 'Error fetching tool definitions:', error);
      // エラーが発生してもアプリケーションを継続できるように、空の配列で初期化
      this.tools = [];
      this.isInitialized = true;
      throw error;
    }
  }

  /**
   * すべてのツール定義を取得
   */
  public getTools(): ToolSchema[] {
    return [...this.tools];
  }

  /**
   * 名前でツールを取得
   */
  public getToolByName(name: string): ToolSchema | undefined {
    return this.tools.find(tool => tool.name === name);
  }

  /**
   * ツールが存在するかチェック
   */
  public hasToolByName(name: string): boolean {
    return this.tools.some(tool => tool.name === name);
  }

  /**
   * コマンドのアクション名が有効かチェック
   */
  public isValidAction(action: string): boolean {
    return this.hasToolByName(action);
  }

  /**
   * コマンドの引数がスキーマに準拠しているか検証
   * @param command 検証するコマンド
   * @returns 検証結果。エラーがある場合はエラーメッセージの配列を返す
   */
  public validateCommandArgs(command: LLMCommand): string[] {
    const errors: string[] = [];
    const tool = this.getToolByName(command.action);

    if (!tool) {
      errors.push(`Unknown tool: ${command.action}`);
      return errors;
    }

    const schema = tool.args_schema;

    if (!schema || !schema.properties) {
      // スキーマが定義されていない場合は検証をスキップ
      return errors;
    }

    // 必須フィールドのチェック
    const required = schema.required || [];
    for (const fieldName of required) {
      // LLMCommandの各フィールドをチェック
      const value = (command as any)[fieldName];
      if (value === undefined || value === null || value === '') {
        errors.push(`Missing required field: ${fieldName}`);
      }
    }

    // 型のチェック（基本的な型のみ）
    for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
      const value = (command as any)[fieldName];

      if (value === undefined || value === null) {
        continue; // 必須チェックで既にチェック済み
      }

      const expectedType = (fieldSchema as any).type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (expectedType === 'string' && actualType !== 'string') {
        errors.push(`Field '${fieldName}' should be string, got ${actualType}`);
      } else if (expectedType === 'number' && actualType !== 'number') {
        errors.push(`Field '${fieldName}' should be number, got ${actualType}`);
      } else if (expectedType === 'boolean' && actualType !== 'boolean') {
        errors.push(`Field '${fieldName}' should be boolean, got ${actualType}`);
      } else if (expectedType === 'array' && !Array.isArray(value)) {
        errors.push(`Field '${fieldName}' should be array, got ${actualType}`);
      } else if (expectedType === 'object' && actualType !== 'object') {
        errors.push(`Field '${fieldName}' should be object, got ${actualType}`);
      }
    }

    return errors;
  }

  /**
   * 初期化済みかどうかを取得
   */
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * ツール定義を再読み込み（開発用）
   */
  public async reload(): Promise<void> {
    this.isInitialized = false;
    this.tools = [];
    await this.initialize();
  }
}

// シングルトンインスタンスをエクスポート
export default ToolService.getInstance();
