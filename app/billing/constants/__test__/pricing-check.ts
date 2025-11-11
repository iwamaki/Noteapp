/**
 * 価格計算確認スクリプト
 * 実行: npx ts-node app/billing/constants/__test__/pricing-check.ts
 */

import { GEMINI_PRICING } from '../../../constants/pricing';
import { TOKEN_PRICING_JPY, PRICING_CONFIG, creditsToTokens } from '../tokenPricing';

console.log('🔍 トークン価格計算チェック');
console.log('================================\n');

console.log(`📊 設定パラメータ:`);
console.log(`  為替レート: ${PRICING_CONFIG.exchangeRate}円/USD`);
console.log(`  マージン率: ${PRICING_CONFIG.marginPercent}%\n`);

console.log('💰 モデル別価格:\n');

const models = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Quick)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Quick)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Think)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Think)' },
];

models.forEach(({ id, name }) => {
  const pricing = GEMINI_PRICING[id];
  if (!pricing) {
    console.log(`  ❌ ${name}: 価格情報なし`);
    return;
  }

  const avgPriceUSD = (pricing.inputPricePer1M + pricing.outputPricePer1M) / 2;
  const costJPY = avgPriceUSD * PRICING_CONFIG.exchangeRate;
  const sellingPrice = TOKEN_PRICING_JPY[id];
  const actualMargin = ((sellingPrice - costJPY) / costJPY) * 100;

  console.log(`  ${name}:`);
  console.log(`    原価: $${avgPriceUSD.toFixed(2)}/M → ¥${Math.round(costJPY)}/M`);
  console.log(`    販売価格: ¥${sellingPrice}/M`);
  console.log(`    マージン: ${actualMargin.toFixed(1)}%\n`);
});

console.log('📝 変換例:\n');

const testCases = [
  { credits: 300, modelId: 'gemini-2.5-flash', modelName: 'Gemini 2.5 Flash' },
  { credits: 500, modelId: 'gemini-2.5-flash', modelName: 'Gemini 2.5 Flash' },
  { credits: 1000, modelId: 'gemini-2.5-flash', modelName: 'Gemini 2.5 Flash' },
  { credits: 300, modelId: 'gemini-2.5-pro', modelName: 'Gemini 2.5 Pro' },
  { credits: 500, modelId: 'gemini-2.5-pro', modelName: 'Gemini 2.5 Pro' },
  { credits: 1000, modelId: 'gemini-2.5-pro', modelName: 'Gemini 2.5 Pro' },
];

testCases.forEach(({ credits, modelId, modelName }) => {
  const tokens = creditsToTokens(modelId, credits);
  const tokensInM = (tokens / 1_000_000).toFixed(2);
  console.log(`  ${credits}円 → ${modelName}: ${tokens.toLocaleString()}トークン (${tokensInM}M)`);
});

console.log('\n================================');
console.log('✅ 価格計算チェック完了\n');
