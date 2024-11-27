// app/api/mmt/positions/rebalance-detail/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const dbPool = getPool();
  let connection = null;

  try {
    connection = await dbPool.getConnection();
    
    // 리밸런싱 상세 정보 조회
    const [[detail]] = await connection.query(
      `SELECT 
        t.*,
        m.token_a_symbol,
        m.token_b_symbol,
        m.token_a_address,
        m.token_b_address,
        c.target_ratio,
        c.rebalance_threshold
       FROM mmt_transactions t
       JOIN mmt_pools m ON t.pool_id = m.id
       LEFT JOIN mmt_pool_configs c ON m.id = c.pool_id
       WHERE t.id = ? AND t.action_type = 'REBALANCE'`,
      [params.id]
    );

    if (!detail) {
      return NextResponse.json(
        { success: false, message: '리밸런싱 기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      detail: {
        ...detail,
        created_at: detail.created_at?.toISOString(),
        target_ratio: detail.target_ratio || 0.5,
        rebalance_threshold: detail.rebalance_threshold || 0.05
      }
    });

  } catch (error) {
    console.error('Rebalance detail error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '리밸런싱 상세 정보 조회 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}