// app/api/mmt/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const actionType = searchParams.get('action_type') || '';

    const offset = (page - 1) * limit;
    const whereConditions = [];
    const queryParams = [];

    if (search) {
      whereConditions.push('tx.tx_signature LIKE ?');
      queryParams.push(`%${search}%`);
    }
    if (status) {
      whereConditions.push('tx.status = ?');
      queryParams.push(status);
    }
    if (actionType) {
      whereConditions.push('tx.action_type = ?');
      queryParams.push(actionType);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    connection = await pool.getConnection();

    // 전체 레코드 수 조회
    const [countResult] = await connection.query(
      `SELECT COUNT(*) as total 
       FROM mmt_transactions tx
       ${whereClause}`,
      queryParams
    );

    // 트랜잭션 데이터 조회
    const [transactions] = await connection.query(
      `SELECT 
        tx.id,
        tx.created_at,
        tx.action_type,
        tx.token_a_amount,
        tx.token_b_amount,
        tx.price,
        tx.price_impact,
        tx.fee_amount,
        tx.gas_used,
        tx.status,
        tx.tx_signature,
        tx.total_cost_usd,
        tx.minimum_received,
        tx.actual_received,
        p.token_a_symbol,
        p.token_b_symbol
       FROM mmt_transactions tx
       LEFT JOIN mmt_pools p ON tx.pool_id = p.id
       ${whereClause}
       ORDER BY tx.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // 트랜잭션 데이터 가공
    const formattedTransactions = transactions.map(tx => ({
      ...tx,
      // AMM은 direction이 없으므로 token_a_amount와 token_b_amount로 방향 유추
      direction: tx.token_a_amount > 0 ? 'BUY' : 'SELL',
      // 표시할 amount는 주요 거래 토큰의 양
      amount: Math.abs(tx.token_a_amount || tx.token_b_amount),
      created_at: new Date(tx.created_at).toISOString()
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      total: countResult[0].total,
      page,
      limit
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '트랜잭션 조회 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}