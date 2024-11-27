// app/api/mmt/positions/snapshots/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const searchParams = request.nextUrl.searchParams;
    const poolId = searchParams.get('poolId');
    const period = searchParams.get('period') || '24h'; // 24h, 7d, 30d
    
    connection = await pool.getConnection();

    // 기간에 따른 WHERE 절 구성
    let timeFilter;
    switch(period) {
      case '7d':
        timeFilter = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        timeFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      default: // 24h
        timeFilter = 'DATE_SUB(NOW(), INTERVAL 24 HOUR)';
    }

    // 스냅샷 데이터 조회
    const [snapshots] = await connection.query(
      `SELECT 
        ps.*,
        p.token_a_symbol,
        p.token_b_symbol
      FROM mmt_pos_snapshots ps
      LEFT JOIN mmt_pools p ON ps.pool_id = p.id
      WHERE ps.timestamp >= ${timeFilter}
      ${poolId ? 'AND ps.pool_id = ?' : ''}
      ORDER BY ps.timestamp ASC`,
      poolId ? [poolId] : []
    );

    return NextResponse.json({
      success: true,
      snapshots
    });

  } catch (error) {
    console.error('Error fetching position snapshots:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '포지션 스냅샷 데이터를 불러오는 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );

  } finally {
    if (connection) {
      connection.release();
    }
  }
}