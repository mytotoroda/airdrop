import { Connection, PublicKey } from '@solana/web3.js';
import { AmmV3, Clmm } from '@raydium-io/raydium-sdk-v2';

export const calculatePoolPrice = (
  baseReserve: number,
  quoteReserve: number,
  baseDecimals: number,
  quoteDecimals: number
): number => {
  if (baseReserve <= 0) return 0;
  
  const baseAdjusted = baseReserve / Math.pow(10, baseDecimals);
  const quoteAdjusted = quoteReserve / Math.pow(10, quoteDecimals);
  return quoteAdjusted / baseAdjusted;
};

export const verifyRaydiumPool = async (
  poolAddress: string,
  connection: Connection
) => {
  try {
    console.log('Verifying pool address:', poolAddress);
    const poolPublicKey = new PublicKey(poolAddress);
    
    // AMM V3 풀 정보 조회 시도
    try {
      const poolsInfo = await AmmV3.getPools({
        connection,
        poolIds: [poolPublicKey]
      });

      if (poolsInfo && poolsInfo.length > 0) {
        const poolInfo = poolsInfo[0];
        return {
          baseDecimals: poolInfo.tokenA?.decimals || 9,
          quoteDecimals: poolInfo.tokenB?.decimals || 9,
          lpDecimals: 9,
          baseReserve: Number(poolInfo.tokenA?.amount || 0),
          quoteReserve: Number(poolInfo.tokenB?.amount || 0),
          lpSupply: 0, // AmmV3에서는 사용하지 않음
          startTime: Date.now() / 1000,
          programId: poolInfo.programId?.toString() || 'unknown',
          ammId: poolAddress,
          status: 'ACTIVE',
          poolType: 'AMM'
        };
      }
    } catch (e) {
      console.log('Failed to get AMM V3 pool info, trying Clmm...');
    }

    // Concentrated Liquidity 풀 정보 조회 시도
    try {
      const clmmPool = await Clmm.getPool({
        connection,
        poolId: poolPublicKey
      });

      if (clmmPool) {
        return {
          baseDecimals: clmmPool.tokenA?.decimals || 9,
          quoteDecimals: clmmPool.tokenB?.decimals || 9,
          lpDecimals: 9,
          baseReserve: Number(clmmPool.tokenA?.amount || 0),
          quoteReserve: Number(clmmPool.tokenB?.amount || 0),
          lpSupply: 0,
          startTime: Date.now() / 1000,
          programId: clmmPool.programId?.toString() || 'unknown',
          ammId: poolAddress,
          status: 'ACTIVE',
          poolType: 'CL',
          currentPrice: clmmPool.currentPrice
        };
      }
    } catch (e) {
      console.log('Failed to get Clmm pool info');
    }

    // 기본값 반환
    return {
      baseDecimals: 9,
      quoteDecimals: 9,
      lpDecimals: 9,
      baseReserve: 0,
      quoteReserve: 0,
      lpSupply: 0,
      startTime: Date.now() / 1000,
      programId: 'unknown',
      ammId: poolAddress,
      status: 'ACTIVE',
      poolType: 'UNKNOWN'
    };

  } catch (error) {
    console.error('Error in verifyRaydiumPool:', error);
    return {
      baseDecimals: 9,
      quoteDecimals: 9,
      lpDecimals: 9,
      baseReserve: 0,
      quoteReserve: 0,
      lpSupply: 0,
      startTime: Date.now() / 1000,
      programId: 'unknown',
      ammId: poolAddress,
      status: 'ACTIVE',
      poolType: 'UNKNOWN'
    };
  }
};