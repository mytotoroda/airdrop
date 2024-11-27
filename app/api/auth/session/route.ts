// app/api/auth/session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

// 현재 세션 조회
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
    
    // 현재 활성 세션 조회
    const [sessions] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM web3auth_sessions 
       WHERE user_id = ? AND session_status = 'ACTIVE'
       ORDER BY login_at DESC
       LIMIT 1`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      session: sessions[0] || null
    });

  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { success: false, message: '세션 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 로그아웃 처리
export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { userId, sessionId } = await request.json();
    
    connection = await pool.getConnection();
    
    await connection.beginTransaction();

    try {
      // 세션 종료 처리
      await connection.query(
        `UPDATE web3auth_sessions 
         SET logout_at = CURRENT_TIMESTAMP,
             session_status = 'LOGGED_OUT'
         WHERE id = ? AND user_id = ?`,
        [sessionId, userId]
      );

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: '로그아웃되었습니다.'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error logging out:', error);
    return NextResponse.json(
      { success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 로그인 시도 기록
export async function PUT(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { email, walletAddress, status, errorMessage } = await request.json();
    
    connection = await pool.getConnection();
    
    await connection.query(
      `INSERT INTO web3auth_login_attempts 
       (email, wallet_address, ip_address, user_agent, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        email,
        walletAddress,
        request.ip || '',
        request.headers.get('user-agent') || '',
        status,
        errorMessage
      ]
    );

    return NextResponse.json({
      success: true,
      message: '로그인 시도가 기록되었습니다.'
    });

  } catch (error) {
    console.error('Error recording login attempt:', error);
    return NextResponse.json(
      { success: false, message: '로그인 시도 기록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}