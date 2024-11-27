// app/api/mmt/pool-state/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Pool ID is required' },
      { status: 400 }
    );
  }

  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();

    // 메인 쿼리 
    const [pools] = await connection.query(`
      SELECT 
        p.id,
        p.token_a_reserve,
        p.token_b_reserve,
        p.token_a_symbol,
        p.token_b_symbol,
        p.last_price,
        p.liquidity_usd,
        p.volume_24h,
        COALESCE(pc.base_spread, 0.003) as fee
      FROM mmt_pools p
      LEFT JOIN mmt_pool_configs pc ON p.id = pc.pool_id
      WHERE p.id = ?
      AND p.status = 'ACTIVE'
    `, [id]);

    console.log('Debug - Query Result:', pools);

    // 결과가 배열인 경우 첫 번째 항목 사용
    const poolData = Array.isArray(pools) ? pools[0] : pools;

    if (!poolData) {
      console.log('No pool found for ID:', id);
      return NextResponse.json(
        { error: 'Pool not found' },
        { status: 404 }
      );
    }

    // 응답 데이터 구성
    const poolState = {
      tokenAReserve: Number(poolData.token_a_reserve) || 0,
      tokenBReserve: Number(poolData.token_b_reserve) || 0,
      tokenASymbol: poolData.token_a_symbol || 'Unknown',
      tokenBSymbol: poolData.token_b_symbol || 'Unknown',
      currentPrice: Number(poolData.last_price) || 0,
      fee: Number(poolData.fee) || 0.003,
      liquidityUSD: Number(poolData.liquidity_usd) || 0,
      volume24h: Number(poolData.volume_24h) || 0
    };

    console.log('Debug - Processed Pool State:', poolState);

    return NextResponse.json({ poolState });

  } catch (error) {
    console.error('Error fetching pool state:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch pool state',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}