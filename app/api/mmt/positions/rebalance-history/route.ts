// app/api/mmt/positions/rebalance-history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  const dbPool = getPool();
  let connection = null;

  try {
    connection = await dbPool.getConnection();
    
    // 1. 현재 데이터 확인을 위한 로깅 추가
    const [rows] = await connection.query(
      `SELECT t.*, m.token_a_symbol, m.token_b_symbol
       FROM mmt_transactions t
       JOIN mmt_pools m ON t.pool_id = m.id
       WHERE t.action_type = 'REBALANCE'
       ORDER BY t.created_at DESC
       LIMIT 10`
    );
    
    // 2. 데이터 로깅
    //console.log('Rebalance History Data:', JSON.stringify(rows, null, 2));

    return NextResponse.json({
      success: true, 
      history: rows.map((row: any) => ({
        ...row,
        created_at: row.created_at?.toISOString()
      }))
    });

  } catch (error) {
    console.error('Rebalance history error:', error);
    return NextResponse.json(
      { success: false, message: '히스토리 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}