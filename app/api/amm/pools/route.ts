import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    
    // 활성 풀 목록 조회
    const [pools] = await connection.query(
      `SELECT * FROM mmt_pools WHERE status = 'ACTIVE' ORDER BY created_at DESC`
    );

    return NextResponse.json({ 
      success: true, 
      pools 
    });

  } catch (error) {
    console.error('Error fetching pools:', error);
    return NextResponse.json(
      { success: false, message: '풀 정보를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { 
      tokenAAddress, 
      tokenBAddress, 
      feeRate,
      creatorWallet 
    } = await request.json();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 새로운 풀 생성
      const [result] = await connection.query(
        `INSERT INTO mmt_pools (
          pool_address,
          token_a_address,
          token_b_address,
          token_a_reserve,
          token_b_reserve,
          fee_rate,
          creator_wallet,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'POOL_ADDRESS', // TODO: Generate actual pool address
          tokenAAddress,
          tokenBAddress,
          0, // Initial reserves
          0,
          feeRate,
          creatorWallet,
          'ACTIVE'
        ]
      );

      await connection.commit();

      return NextResponse.json({ 
        success: true, 
        message: '풀이 성공적으로 생성되었습니다.',
        poolId: result.insertId
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error creating pool:', error);
    return NextResponse.json(
      { success: false, message: '풀 생성에 실패했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}