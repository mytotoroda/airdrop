import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { raydiumService } from '@/lib/mmt/raydium';

export const dynamic = 'force-dynamic';

function calculateAmountsFromSqrtPrice(
  liquidity: string,
  sqrtPriceX64: string,
  tickCurrent: number,
  tickSpacing: number,
  decimalsA: number = 9,
  decimalsB: number = 9
): { tokenAAmount: number; tokenBAmount: number } {
  try {
    const L = BigInt(liquidity);
    const P = BigInt(sqrtPriceX64);
    const Q64 = BigInt(1) << BigInt(64);

    // Calculate price from sqrtPriceX64
    const price = Number(P * P) / Number(Q64 * Q64);

    // Get tick range
    const tickLower = tickCurrent - (tickSpacing * 10);  // Wider range for better estimation
    const tickUpper = tickCurrent + (tickSpacing * 10);

    // Calculate sqrt prices at boundaries
    const sqrtPriceLower = BigInt(Math.floor(Math.sqrt(Math.pow(1.0001, tickLower)) * Number(Q64)));
    const sqrtPriceUpper = BigInt(Math.floor(Math.sqrt(Math.pow(1.0001, tickUpper)) * Number(Q64)));

    let tokenAAmount = 0;
    let tokenBAmount = 0;

    // Calculate token A amount (X)
    if (P <= sqrtPriceUpper) {
      const deltaX = Number(L * Q64 * (sqrtPriceUpper - P)) / Number(P * sqrtPriceUpper);
      tokenAAmount = deltaX / Math.pow(10, decimalsA);
    }

    // Calculate token B amount (Y)
    if (P >= sqrtPriceLower) {
      const deltaY = Number(L * (P - sqrtPriceLower)) / Number(Q64);
      tokenBAmount = deltaY / Math.pow(10, decimalsB);
    }

    console.log('Calculation details:', {
      liquidity: Number(L),
      sqrtPriceX64: Number(P),
      price,
      tickCurrent,
      tickLower,
      tickUpper,
      rawTokenAAmount: tokenAAmount,
      rawTokenBAmount: tokenBAmount
    });

    return {
      tokenAAmount: Math.max(0, tokenAAmount),
      tokenBAmount: Math.max(0, tokenBAmount)
    };
  } catch (error) {
    console.error('Error in calculateAmountsFromSqrtPrice:', error);
    return { tokenAAmount: 0, tokenBAmount: 0 };
  }
}

async function getClmmPoolData(pool: any) {
  try {
    console.log('\n=== getClmmPoolData Start ===');
    console.log('Input Pool Data:', {
      pool_address: pool.pool_address,
      token_a_symbol: pool.token_a_symbol,
      token_b_symbol: pool.token_b_symbol,
      decimals: {
        tokenA: pool.token_a_decimals || 9,
        tokenB: pool.token_b_decimals || 9
      }
    });

    const sdk = await raydiumService.initializeSdk();
    const poolData = await sdk.clmm.getRpcClmmPoolInfos({
      poolIds: [pool.pool_address],
    });
    
    if (!poolData || !poolData[pool.pool_address]) {
      throw new Error('Pool info not found');
    }
    
    const poolInfo = poolData[pool.pool_address];
    console.log('Raw Pool Info:', {
      currentPrice: poolInfo.currentPrice,
      sqrtPriceX64: poolInfo.sqrtPriceX64?.toString(),
      tickCurrent: poolInfo.tickCurrent,
      tickSpacing: poolInfo.tickSpacing,
      liquidity: poolInfo.liquidity?.toString()
    });

    const { tokenAAmount, tokenBAmount } = calculateAmountsFromSqrtPrice(
      poolInfo.liquidity?.toString() || '0',
      poolInfo.sqrtPriceX64?.toString() || '0',
      poolInfo.tickCurrent || 0,
      poolInfo.tickSpacing || 1,
      pool.token_a_decimals || 9,
      pool.token_b_decimals || 9
    );

    // SOL 가격 적용 (B토큰이 SOL인 경우)
    const solPrice = pool.token_b_symbol === 'SOL' ? 60 : 1; // SOL 예상 가격, 실제로는 API에서 가져와야 함
    const tokenPrice = poolInfo.currentPrice || 0;

    // 토큰 가치 계산 수정
    const tokenAValue = tokenAAmount * tokenPrice * solPrice; // TokenA의 USD 가치
    const tokenBValue = tokenBAmount * solPrice; // TokenB(SOL)의 USD 가치
    const totalValue = tokenAValue + tokenBValue;

    const result = {
      baseAmount: tokenAAmount,
      quoteAmount: tokenBAmount,
      baseValue: tokenAValue,
      quoteValue: tokenBValue,
      totalValue: totalValue,
      price: poolInfo.currentPrice || 0,
      tickCurrent: poolInfo.tickCurrent || 0,
      liquidity: poolInfo.liquidity?.toString() || '0',
      success: true
    };

    console.log('Calculated Result:', {
      baseAmount: result.baseAmount,
      quoteAmount: result.quoteAmount,
      baseValue: result.baseValue,
      quoteValue: result.quoteValue,
      totalValue: result.totalValue,
      price: result.price,
      tickCurrent: result.tickCurrent
    });

    return result;

  } catch (error) {
    console.error('=== CLMM Pool Error ===', error);
    return {
      baseAmount: pool.current_token_a_amount || 0,
      quoteAmount: pool.current_token_b_amount || 0,
      baseValue: 0,
      quoteValue: 0,
      totalValue: 0,
      price: pool.current_price || pool.last_price || 0,
      tickCurrent: pool.tick_current || 0,
      liquidity: pool.liquidity || '0',
      success: false
    };
  }
}

export async function GET(request: NextRequest) {
  const dbPool = getPool();
  let connection = null;

  try {
    connection = await dbPool.getConnection();
    
    const [pools] = await connection.query(
      `SELECT m.*, t1.decimals as token_a_decimals, t2.decimals as token_b_decimals 
       FROM mmt_pools m
       LEFT JOIN token_metadata t1 ON m.token_a_address = t1.address
       LEFT JOIN token_metadata t2 ON m.token_b_address = t2.address
       WHERE m.status = 'ACTIVE' AND m.pool_type = 'CL'`
    );

    const positions = await Promise.all(pools.map(async (pool: any) => {
      const onchainData = await getClmmPoolData(pool);
      
      const position = {
        id: pool.id,
        pool_id: pool.id,
        pool_address: pool.pool_address,
        token_a_amount: onchainData.baseAmount,
        token_b_amount: onchainData.quoteAmount,
        token_a_value_usd: onchainData.baseAmount * onchainData.price,
        token_b_value_usd: onchainData.quoteAmount,
        total_value_usd: (onchainData.baseAmount * onchainData.price) + onchainData.quoteAmount,
        volume_24h: pool.volume_24h || 0,
        current_price: onchainData.price,
        tick_current: onchainData.tickCurrent,
        liquidity: onchainData.liquidity,
        price_change_24h: pool.last_price ? 
          ((onchainData.price - pool.last_price) / pool.last_price) * 100 : 0,
        token_a_symbol: pool.token_a_symbol,
        token_b_symbol: pool.token_b_symbol,
        tick_spacing: pool.tick_spacing,
        last_update: new Date().toISOString()
      };

      await connection.query(
        `UPDATE mmt_pools 
         SET current_price = ?,
             liquidity_usd = ?,
             liquidity = ?,
             tick_current = ?,
             updated_at = NOW() 
         WHERE id = ?`,
        [
          position.current_price, 
          position.total_value_usd,
          position.liquidity,
          position.tick_current,
          position.id
        ]
      );

      return position;
    }));

    return NextResponse.json({ 
      success: true, 
      positions,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '데이터 조회 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}