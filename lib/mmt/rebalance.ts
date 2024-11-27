// lib/mmt/rebalance.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { Raydium } from '@raydium-io/raydium-sdk-v2';

interface RebalanceParams {
  poolAddress: string;
  targetRatio: number;
  currentPrice: number;
  tokenAAmount: number;
  tokenBAmount: number;
  maxSlippage: number;
  minTradeSize: number;
  maxTradeSize: number;
}

interface RebalanceAction {
  type: 'BUY' | 'SELL';
  amount: number;
  expectedPrice: number;
  minReceived: number;
  maxSpent: number;
}

export async function calculateRebalanceAction(params: RebalanceParams): Promise<RebalanceAction | null> {
  const {
    targetRatio,
    currentPrice,
    tokenAAmount,
    tokenBAmount,
    maxSlippage,
    minTradeSize,
    maxTradeSize
  } = params;

  // 현재 비율 계산 (TokenA의 USD 가치 / TokenB의 USD 가치)
  const currentRatio = (tokenAAmount * currentPrice) / tokenBAmount;
  
  // 리밸런싱이 필요한지 확인
  const ratioDiff = currentRatio - targetRatio;
  if (Math.abs(ratioDiff) < 0.01) {
    return null; // 리밸런싱 불필요
  }

  // 필요한 거래 방향과 수량 계산
  const isSellingTokenA = currentRatio > targetRatio;
  
  let tradeAmount;
  if (isSellingTokenA) {
    // TokenA를 팔아야 하는 경우
    tradeAmount = (tokenAAmount * (currentRatio - targetRatio)) / (2 * currentRatio);
  } else {
    // TokenA를 사야 하는 경우
    tradeAmount = (tokenBAmount * (targetRatio - currentRatio)) / (2 * targetRatio * currentPrice);
  }

  // 거래 크기 제한 적용
  tradeAmount = Math.max(minTradeSize, Math.min(maxTradeSize, tradeAmount));

  const slippageAdjustment = 1 - maxSlippage;
  
  return {
    type: isSellingTokenA ? 'SELL' : 'BUY',
    amount: tradeAmount,
    expectedPrice: currentPrice,
    minReceived: isSellingTokenA ? 
      tradeAmount * currentPrice * slippageAdjustment :
      tradeAmount / currentPrice * slippageAdjustment,
    maxSpent: isSellingTokenA ?
      tradeAmount :
      tradeAmount * currentPrice * (1 + maxSlippage)
  };
}

export async function executeRebalance(
  sdk: Raydium,
  poolAddress: string,
  action: RebalanceAction
): Promise<{ signature: string; success: boolean; error?: string }> {
  try {
    // CLMM 풀 정보 가져오기
    const poolData = await sdk.clmm.getRpcClmmPoolInfos({
      poolIds: [poolAddress],
    });

    if (!poolData || !poolData[poolAddress]) {
      throw new Error('Pool data not found');
    }

    const poolInfo = poolData[poolAddress];

    // 스왑 파라미터 설정
    const swapParams = {
      poolInfo,
      amountIn: action.amount,
      amountOutMin: action.minReceived,
      sqrtPriceLimitX64: 0n, // 0은 제한 없음을 의미
      isBaseInput: action.type === 'SELL'
    };

    // 트랜잭션 생성
    const { innerTransactions } = await sdk.clmm.makeSwapInstructionSimple(swapParams);

    // 트랜잭션 실행
    const txid = await sdk.sendAndConfirmTransaction({
      transactionPayload: {
        instructions: innerTransactions[0].instructions
      }
    });

    return {
      signature: txid,
      success: true
    };

  } catch (error) {
    console.error('Rebalance execution error:', error);
    return {
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}