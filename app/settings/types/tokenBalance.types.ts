/**
 * @file tokenBalance.types.ts
 * @summary トークン残高関連の型定義
 */

// トークン容量制限（カテゴリーごとの全モデル合計上限）
export const TOKEN_CAPACITY_LIMITS = {
  quick: 5000000, // Quick カテゴリー: 5M tokens
  think: 1000000, // Think カテゴリー: 1M tokens
} as const;

// 購入履歴レコード
export interface PurchaseRecord {
  id: string; // ユニークID
  type: 'initial' | 'addon'; // 購入タイプ（単発購入のみ）
  productId: string; // プロダクトID
  purchaseToken: string; // 購入トークン（IAP検証用）
  transactionId: string; // トランザクションID
  purchaseDate: string; // 購入日時（ISO 8601）
  amount: number; // 支払額（円）
  creditsAdded: number; // 追加されたクレジット額（円建て）
}

// トークン残高
export interface TokenBalance {
  credits: number; // 未配分のクレジット（円建て）
  allocatedTokens: {
    [modelId: string]: number; // モデルIDごとの配分済みトークン数
  };
}

// 装填中のモデル（Quick/Thinkスロットに装填されているモデル）
export interface LoadedModels {
  quick: string; // Quickスロットに装填されているモデルID
  think: string; // Thinkスロットに装填されているモデルID
}

export const defaultTokenBalance: TokenBalance = {
  credits: 0,
  allocatedTokens: {
    'gemini-2.5-flash': 0,
    'gemini-2.5-pro': 0,
  },
};

export const defaultLoadedModels: LoadedModels = {
  quick: 'gemini-2.5-flash',
  think: 'gemini-2.5-pro',
};
