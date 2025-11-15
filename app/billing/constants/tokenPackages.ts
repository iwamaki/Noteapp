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
  credits: number; // 付与されるクレジット額（円建て、通常は price と同じ）
  productId: string; // IAP プロダクトID
  isInitial?: boolean; // 初回購入専用パッケージかどうか
  badge?: string; // バッジ表示（例: "おすすめ", "お得"）
}

/**
 * トークンパッケージ定義
 * Quick トークンと Think トークンの両方を購入可能
 */
export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'small',
    name: 'スモール',
    description: '少量のクレジットが必要な方に',
    price: 300,
    credits: 300,
    productId: Platform.select({
      ios: 'noteapp.credits.small',
      android: 'noteapp.credits.small',
    }) as string,
  },
  {
    id: 'regular',
    name: 'レギュラー',
    description: '標準的な使用量に対応',
    price: 500,
    credits: 500,
    productId: Platform.select({
      ios: 'noteapp.credits.regular',
      android: 'noteapp.credits.regular',
    }) as string,
  },
  {
    id: 'large',
    name: 'ラージ',
    description: 'ヘビーユーザー向け',
    price: 1000,
    credits: 1000,
    productId: Platform.select({
      ios: 'noteapp.credits.large',
      android: 'noteapp.credits.large',
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
