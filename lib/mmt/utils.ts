export function calculateTradingParams(strategy: MarketMakingStrategy, currentPrice: number) {
  const bidPrice = currentPrice * (1 - (strategy.baseSpread + strategy.bidAdjustment) / 100);
  const askPrice = currentPrice * (1 + (strategy.baseSpread + strategy.askAdjustment) / 100);
  return { bidPrice, askPrice };
}