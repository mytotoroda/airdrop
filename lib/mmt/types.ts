/ 4-1. lib/mmt/types.ts - 타입 정의
interface MarketMakingStrategy {
  baseSpread: number;
  bidAdjustment: number;
  askAdjustment: number;
  checkInterval: number;
  minTradeSize: number;
  maxTradeSize: number;
  tradeSizePercentage: number;
  targetRatio: number;
  rebalanceThreshold: number;
  maxPositionSize: number;
  maxSlippage: number;
  stopLossPercentage: number;
  emergencyStop: boolean;
  enabled: boolean;
}