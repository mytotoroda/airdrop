// app/api/mmt/token-pairs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    
    // 거래량이 있는 토큰 페어 조회
    const [rows] = await connection.query(`
      SELECT DISTINCT
        p.token_a_address as base_token_address,
        p.token_b_address as quote_token_address,
        p.pool_address,
        COALESCE(SUM(t.token_b_amount), 0) as volume_24h
      FROM mmt_pools p
      LEFT JOIN amm_transactions t ON 
        p.id = t.pool_id AND 
        t.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      WHERE p.status = 'ACTIVE'
      GROUP BY p.pool_address
      ORDER BY volume_24h DESC
    `);

    // 토큰 정보 추가
    const tokenPairs = await Promise.all(rows.map(async (row: any) => {
      // 여기서는 예시 데이터를 반환합니다.
      // 실제 구현시에는 토큰 메타데이터를 가져와야 합니다.
      return {
        id: row.pool_address,
        symbol: `${row.base_token_address.slice(0,4)}/${row.quote_token_address.slice(0,4)}`,
        baseToken: {
          address: row.base_token_address,
          symbol: row.base_token_address.slice(0,4),
          name: `Token ${row.base_token_address.slice(0,4)}`,
          logoURI: `/api/placeholder/32/32`
        },
        quoteToken: {
          address: row.quote_token_address,
          symbol: row.quote_token_address.slice(0,4),
          name: `Token ${row.quote_token_address.slice(0,4)}`,
          logoURI: `/api/placeholder/32/32`
        },
        lastPrice: Math.random() * 100, // 예시 데이터
        priceChangePercent24h: (Math.random() * 20) - 10 // 예시 데이터
      };
    }));

    return NextResponse.json(tokenPairs);

  } catch (error) {
    console.error('Error fetching token pairs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token pairs' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}