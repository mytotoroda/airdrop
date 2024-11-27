// app/api/mmt/pools/getall/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    
    // 활성화된 풀 목록 조회
    const [pools] = await connection.query(`
      SELECT 
        p.id,
        p.pool_address,
        p.token_a_symbol,
        p.token_a_decimals,
        p.token_b_symbol,
        p.token_b_decimals,
        p.status,
        p.pool_type,
        p.fee_rate,
        COALESCE(pc.enabled, false) as strategy_enabled,
        COALESCE(p.current_price, 0) as current_price,
        COALESCE(p.liquidity_usd, 0) as liquidity_usd
      FROM mmt_pools p
      LEFT JOIN mmt_pool_configs pc ON p.id = pc.pool_id
      WHERE p.status != 'INACTIVE'
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json({ 
      success: true, 
      pools: pools 
    });

  } catch (error) {
    console.error('Error fetching pools:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '풀 목록을 불러오는데 실패했습니다.' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}