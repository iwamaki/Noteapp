/**
 * @file tokenPackages.ts
 * @summary トークン購入パッケージの定義
 * @description Phase 1 MVP で提供するトークン購入パッケージの詳細を定義します。
 */

import { Platform } from 'react-native';

/**
 * トークンパッケージの型定義
 */
export interface TokenPackage {
  id: string; // パッケージID
  name: string; // パッケージ名
  description: string; // パッケージの説明
  price: number; // 価格（円）
  tokens: {
    flash: number; // 付与されるQuickトークン数
    pro: number; // 付与されるThinkトークン数
  };
  productId: string; // IAP プロダクトID
  isInitial?: boolean; // 初回購入専用パッケージかどうか
  badge?: string; // バッジ表示（例: "おすすめ", "お得"）
}

/**
 * トークンパッケージ定義
 * Quick トークンと Think トークンの両方を購入可能
 */
export const TOKEN_PACKAGES: TokenPackage[] = [
  // Quick トークン - 初回購入パッケージ（初回のみ表示）
  {
    id: 'initial',
    name: '初回購入 (Quick)',
    description: '初めてのトークン購入 - 低コストモデル用',
    price: 300,
    tokens: {
      flash: 1000000, // 1.0M Quick tokens
      pro: 0,
    },
    productId: Platform.select({
      ios: 'noteapp.tokens.initial',
      android: 'noteapp.tokens.initial',
    }) as string,
    isInitial: true,
    badge: '初回限定',
  },

  // Quick トークン - 通常パッケージ
  {
    id: 'small',
    name: 'Quick スモール',
    description: '少量のQuickトークンが必要な方に',
    price: 300,
    tokens: {
      flash: 500000, // 0.5M Quick tokens
      pro: 0,
    },
    productId: Platform.select({
      ios: 'noteapp.tokens.small',
      android: 'noteapp.tokens.small',
    }) as string,
  },
  {
    id: 'regular',
    name: 'Quick レギュラー',
    description: 'Quickモデルの標準的な使用量に対応',
    price: 500,
    tokens: {
      flash: 1000000, // 1.0M Quick tokens
      pro: 0,
    },
    productId: Platform.select({
      ios: 'noteapp.tokens.regular',
      android: 'noteapp.tokens.regular',
    }) as string,
    badge: 'おすすめ',
  },
  {
    id: 'large',
    name: 'Quick ラージ',
    description: 'Quickモデルのヘビーユーザー向け',
    price: 1000,
    tokens: {
      flash: 3000000, // 3.0M Quick tokens
      pro: 0,
    },
    productId: Platform.select({
      ios: 'noteapp.tokens.large',
      android: 'noteapp.tokens.large',
    }) as string,
    badge: 'お得',
  },

  // Think トークン - 通常パッケージ
  {
    id: 'pro_small',
    name: 'Think スモール',
    description: '少量のThinkトークンが必要な方に',
    price: 300,
    tokens: {
      flash: 0,
      pro: 100000, // 0.1M Think tokens
    },
    productId: Platform.select({
      ios: 'noteapp.tokens.pro.small',
      android: 'noteapp.tokens.pro.small',
    }) as string,
  },
  {
    id: 'pro_regular',
    name: 'Think レギュラー',
    description: 'Thinkモデルの標準的な使用量に対応',
    price: 500,
    tokens: {
      flash: 0,
      pro: 200000, // 0.2M Think tokens
    },
    productId: Platform.select({
      ios: 'noteapp.tokens.pro.regular',
      android: 'noteapp.tokens.pro.regular',
    }) as string,
    badge: 'おすすめ',
  },
  {
    id: 'pro_large',
    name: 'Think ラージ',
    description: 'Thinkモデルのヘビーユーザー向け',
    price: 1000,
    tokens: {
      flash: 0,
      pro: 700000, // 0.7M Think tokens
    },
    productId: Platform.select({
      ios: 'noteapp.tokens.pro.large',
      android: 'noteapp.tokens.pro.large',
    }) as string,
    badge: 'お得',
  },
];

/**
 * 初回購入が完了しているかチェック
 * @param purchaseHistory 購入履歴
 * @returns 初回購入が完了していれば true
 */
export function hasInitialPurchase(purchaseHistory: any[]): boolean {
  return purchaseHistory.some((record) => record.type === 'initial');
}

/**
 * 購入可能なパッケージリストを取得
 * @param purchaseHistory 購入履歴
 * @returns 購入可能なパッケージのリスト
 */
export function getAvailablePackages(purchaseHistory: any[]): TokenPackage[] {
  const hasInitial = hasInitialPurchase(purchaseHistory);

  if (!hasInitial) {
    // 初回購入が完了していない場合は、初回パッケージのみ表示
    return TOKEN_PACKAGES.filter((pkg) => pkg.isInitial);
  }

  // 初回購入が完了している場合は、通常パッケージのみ表示
  return TOKEN_PACKAGES.filter((pkg) => !pkg.isInitial);
}

/**
 * パッケージIDからパッケージ情報を取得
 * @param id パッケージID
 * @returns パッケージ情報、見つからない場合は undefined
 */
export function getPackageById(id: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find((pkg) => pkg.id === id);
}

/**
 * プロダクトIDからパッケージ情報を取得
 * @param productId プロダクトID
 * @returns パッケージ情報、見つからない場合は undefined
 */
export function getPackageByProductId(productId: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find((pkg) => pkg.productId === productId);
}

/**
 * トークン数を読みやすい形式にフォーマット
 * @param tokens トークン数
 * @returns フォーマットされた文字列（例: "500,000", "1,000,000"）
 */
export function formatTokenAmount(tokens: number): string {
  return tokens.toLocaleString('ja-JP');
}
