// app/api/auth/web3auth/transactions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const {
      email,
      txHash,
      txType,
      amount,
      tokenAddress = 'SOL', // SOL 전송의 경우 'SOL'로 설정
      status
    } = await request.json();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.query(
        `INSERT INTO web3auth_transactions 
        (email, tx_hash, tx_type, amount, token_address, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [email, txHash, txType, amount, tokenAddress, status]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: '트랜잭션이 기록되었습니다.',
        transactionId: (result as any).insertId
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error recording transaction:', error);
    return NextResponse.json(
      { success: false, message: '트랜잭션 기록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 트랜잭션 목록 조회
export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: '사용자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    
    const [transactions] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM web3auth_transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      transactions
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, message: '트랜잭션 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}