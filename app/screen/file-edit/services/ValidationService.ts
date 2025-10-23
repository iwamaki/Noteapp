/**
 * @file services/ValidationService.ts
 * @summary ファイルのバリデーションロジック
 * @description 入力値の検証ルールを一元管理
 */

import { ValidationRule, ValidationResult } from '../types';
import { File } from '@data/type';

/**
 * バリデーションサービス
 * ファイルデータの妥当性を検証
 */
export class ValidationService {
  private rules: ValidationRule[] = [
    {
      field: 'title',
      validate: (value: string) => Boolean(value && value.trim().length > 0),
      message: 'タイトルは必須です',
    },
    {
      field: 'title',
      validate: (value: string) => !value || value.length <= 100,
      message: 'タイトルは100文字以内で入力してください',
    },
    {
      field: 'content',
      validate: (value: string) => !value || value.length <= 100000,
      message: 'コンテンツは100,000文字以内で入力してください',
    },
  ];

  /**
   * ファイル全体をバリデーション
   */
  validateFile(data: Partial<File>): ValidationResult {
    const errors: string[] = [];

    for (const rule of this.rules) {
      const value = data[rule.field as keyof File];
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * タイトルのみをバリデーション
   */
  validateTitle(title: string): string | null {
    const titleRules = this.rules.filter((r) => r.field === 'title');

    for (const rule of titleRules) {
      if (!rule.validate(title)) {
        return rule.message;
      }
    }

    return null;
  }

  /**
   * コンテンツのみをバリデーション
   */
  validateContent(content: string): string | null {
    const contentRules = this.rules.filter((r) => r.field === 'content');

    for (const rule of contentRules) {
      if (!rule.validate(content)) {
        return rule.message;
      }
    }

    return null;
  }

  /**
   * カスタムルールを追加
   */
  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  /**
   * ルールをクリア
   */
  clearRules(): void {
    this.rules = [];
  }
}
