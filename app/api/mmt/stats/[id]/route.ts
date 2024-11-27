// app/api/mmt/stats/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 로깅 유틸리티
const logStep = (step: string, data?: any) => {
  console.log('\n--------------------');
  console.log(`[Pool Stats API] ${step}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('--------------------\n');
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  let connection = null;
  
  try {
    const poolId = params.id;
    //logStep('Request received', { poolId });

    if (!poolId) {
      return NextResponse.json(
        { success: false, message: 'Pool ID is required' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // 기본 풀 정보 조회
    const [poolInfo] = await connection.query(`
      SELECT 
        p.id,
        p.pool_address,
        p.token_a_symbol,
        p.token_b_symbol,
        p.last_price,
        p.volume_24h,
        p.liquidity_usd
      FROM mmt_pools p
      WHERE p.id = ?
    `, [poolId]);

    //logStep('Pool info retrieved', { poolInfo });

    if (!poolInfo || poolInfo.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Pool not found' },
        { status: 404 }
      );
    }

    // 24시간 통계 조회
    const [stats] = await connection.query(`
      SELECT 
        price,
        volume_24h,
        liquidity_usd,
        timestamp
      FROM mmt_pool_stats
      WHERE pool_id = ?
      AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY timestamp DESC
    `, [poolId]);

   // logStep('Stats retrieved', { statsCount: stats.length });

    // 24시간 전의 가격 찾기
    const oldPrice = stats.length > 0 ? stats[stats.length - 1].price : poolInfo[0].last_price;
    const currentPrice = poolInfo[0].last_price;

    // 고가/저가 계산
    let high24h = currentPrice;
    let low24h = currentPrice;
    if (stats.length > 0) {
      high24h = Math.max(...stats.map(s => s.price));
      low24h = Math.min(...stats.map(s => s.price));
    }

    // 가격 변동 계산
    const priceChange24h = currentPrice - oldPrice;
    const priceChangePercent24h = oldPrice > 0 
      ? (priceChange24h / oldPrice) * 100 
      : 0;

    const responseData = {
      success: true,
      data: {
        lastPrice: currentPrice,
        priceChange24h,
        priceChangePercent24h,
        high24h,
        low24h,
        volume24h: poolInfo[0].volume_24h,
        marketCap: poolInfo[0].liquidity_usd * 2, // 예시 계산
        updatedAt: new Date().toISOString(),
        poolAddress: poolInfo[0].pool_address,
        tokenPair: `${poolInfo[0].token_a_symbol}/${poolInfo[0].token_b_symbol}`,
        liquidityUsd: poolInfo[0].liquidity_usd
      }
    };

    //logStep('Sending response', responseData);
    return NextResponse.json(responseData);

  } catch (error) {
    logStep('Error occurred', { error });
    console.error('Error fetching pool stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch pool stats' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
      //logStep('Database connection released');
    }
  }
}