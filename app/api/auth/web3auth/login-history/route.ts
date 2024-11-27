// app/api/auth/web3auth/login-history/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;
  try {
    const { 
      email, 
      walletAddress, 
      status, 
      errorMessage, 
      userAgent,
      name,          // 추가
      profileImage,  // 추가
      provider      // 추가
    } = await request.json();
    
    connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // 사용자 존재 여부 확인
      const [existingUsers] = await connection.query(
        'SELECT email FROM web3auth_users WHERE wallet_address = ? OR email = ?',
        [walletAddress, email]
      );

      // 새 사용자인 경우 추가
      if (existingUsers.length === 0) {
        // 새 사용자 생성
        await connection.query(
          `INSERT INTO web3auth_users 
           (email, name, wallet_address, profile_image, auth_provider)
           VALUES (?, ?, ?, ?, ?)`,
          [email, name, walletAddress, profileImage, provider]
        );

        // 기본 사용자 설정 생성
        await connection.query(
          `INSERT INTO web3auth_user_settings (email) VALUES (?)`,
          [email]
        );
      }

      // 로그인 시도 기록
      await connection.query(
        `INSERT INTO web3auth_login_attempts 
        (email, wallet_address, ip_address, user_agent, status, error_message) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [email, walletAddress, request.ip || '', userAgent || '', status, errorMessage || null]
      );

      // 성공적인 로그인인 경우 세션 생성
      if (status === 'SUCCESS') {
        // 기존 활성 세션 종료
        await connection.query(
          `UPDATE web3auth_sessions 
           SET session_status = 'EXPIRED', 
               logout_at = CURRENT_TIMESTAMP 
           WHERE wallet_address = ? 
           AND session_status = 'ACTIVE'`,
          [walletAddress]
        );

        // 새 세션 생성
        await connection.query(
          `INSERT INTO web3auth_sessions 
           (email, wallet_address, ip_address, user_agent) 
           VALUES (?, ?, ?, ?)`,
          [email, walletAddress, request.ip || '', userAgent || '']
        );

        // 마지막 로그인 시간 업데이트
        await connection.query(
          `UPDATE web3auth_users 
           SET last_login = CURRENT_TIMESTAMP,
               name = ?,
               profile_image = ?
           WHERE wallet_address = ?`,
          [name, profileImage, walletAddress]
        );
      }

      await connection.commit();
      return NextResponse.json({
        success: true,
        message: '로그인 기록이 저장되었습니다.'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error recording login attempt:', error);
    return NextResponse.json(
      { success: false, message: '로그인 기록 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}