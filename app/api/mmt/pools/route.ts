// app/api/mmt/pools/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 로깅 유틸리티
const logStep = (step: string, data?: any) => {
  console.log('\n--------------------');
  console.log(`[${new Date().toISOString()}] ${step}`);
  if (data) {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }
  console.log('--------------------\n');
};

export async function GET() {
  //logStep('Starting GET /api/mmt/pools');
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    //logStep('Database connection established');
    
    // AMM 풀 정보 조회 쿼리
    const query = `
      SELECT 
        p.*,
        pc.*,
        pos.token_a_amount,
        pos.token_b_amount,
        pos.total_value_usd,
        pos.token_ratio,
        pos.fees_earned_usd,
        pos.fee_apy,
        (
          SELECT created_at 
          FROM mmt_pos_rebalance_history 
          WHERE pool_id = p.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_rebalance_time,
        tm_a.logo_uri as token_a_logo,
        tm_b.logo_uri as token_b_logo
      FROM mmt_pools p
      LEFT JOIN mmt_pool_configs pc ON p.id = pc.pool_id
      LEFT JOIN mmt_pos_current pos ON p.id = pos.pool_id
      LEFT JOIN token_metadata tm_a ON p.token_a_address = tm_a.address
      LEFT JOIN token_metadata tm_b ON p.token_b_address = tm_b.address
      WHERE p.status != 'INACTIVE'
      ORDER BY p.created_at DESC
    `;

    //logStep('Executing query', { query });
    const [pools] = await connection.query(query);
    //logStep('Raw pool data received', { poolCount: (pools as any[]).length });

    if (pools.length > 0) {
      //logStep('Sample raw pool data', pools[0]);
    }

    // 데이터 구조 변환
    const formattedPools = (pools as any[]).map(pool => {
      const formattedPool = {
        pool_id: pool.id,
        id: `${pool.token_a_symbol}-${pool.token_b_symbol}-${pool.id}`,
        poolAddress: pool.pool_address,
        tokenA: {
          address: pool.token_a_address,
          symbol: pool.token_a_symbol,
          name: pool.token_a_name || pool.token_a_symbol,
          decimals: pool.token_a_decimals,
          logoURI: pool.token_a_logo || null
        },
        tokenB: {
          address: pool.token_b_address,
          symbol: pool.token_b_symbol,
          name: pool.token_b_name || pool.token_b_symbol,
          decimals: pool.token_b_decimals,
          logoURI: pool.token_b_logo || null
        },
        lastPrice: Number(pool.last_price) || 0,
        priceChangePercent24h: 0, // TODO: 24시간 가격 변화율 계산 로직 추가
        liquidityUsd: Number(pool.liquidity_usd) || 0,
        volume24h: Number(pool.volume_24h) || 0,
        fee: Number(pool.fee_rate),
        status: pool.status,
        type: 'AMM',
        
        // 포지션 정보
        position: {
          tokenAAmount: Number(pool.token_a_amount) || 0,
          tokenBAmount: Number(pool.token_b_amount) || 0,
          totalValueUsd: Number(pool.total_value_usd) || 0,
          tokenRatio: Number(pool.token_ratio) || 0.5,
          feesEarned: Number(pool.fees_earned_usd) || 0,
          feeApy: Number(pool.fee_apy) || 0,
          lastRebalance: pool.last_rebalance_time
        }
      };

      //logStep(`Formatted pool ${pool.id}`, {
        //poolId: formattedPool.pool_id,
        //symbols: `${formattedPool.tokenA.symbol}/${formattedPool.tokenB.symbol}`,
        //status: formattedPool.status,
        //liquidity: formattedPool.liquidityUsd
     // });

      return formattedPool;
    });

    //logStep('All pools formatted successfully', { 
     // totalPools: formattedPools.length,
     // statusSummary: formattedPools.reduce((acc, p) => {
     //   acc[p.status] = (acc[p.status] || 0) + 1;
     //   return acc;
     // }, {} as Record<string, number>)
   // });

    return NextResponse.json(formattedPools);

  } catch (error) {
    console.error('\n--------------------');
    console.error(`[${new Date().toISOString()}] Error in GET /api/mmt/pools:`);
    console.error('Error details:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('--------------------\n');

    return NextResponse.json(
      { success: false, message: '풀 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
      //logStep('Database connection released');
    }
  }
}