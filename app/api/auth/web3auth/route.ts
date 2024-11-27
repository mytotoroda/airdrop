//api/auth/web3auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { RowDataPacket } from 'mysql2';
export const dynamic = 'force-dynamic';

interface Web3AuthUser {
  email: string;
  name: string;
  profileImage: string;
  wallet: string;
  provider: string;
}

export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;
  try {
    const userData: Web3AuthUser = await request.json();
    console.log('Received Web3Auth user data:', userData); // 데이터 확인용 로그
    connection = await pool.getConnection();
    // 트랜잭션 시작
    await connection.beginTransaction();
    try {
      // 사용자 존재 여부 확인
      const [existingUsers] = await connection.query<RowDataPacket[]>(
        'SELECT email FROM web3auth_users WHERE wallet_address = ? OR email = ?',
        [userData.wallet, userData.email]
      );

      if (existingUsers.length > 0) {
        // 기존 사용자 업데이트
        await connection.query(
          `UPDATE web3auth_users 
           SET name = ?, profile_image = ?, last_login = CURRENT_TIMESTAMP
           WHERE email = ?`,
          [userData.name, userData.profileImage, userData.email]
        );
      } else {
        // 새 사용자 생성
        await connection.query(
          `INSERT INTO web3auth_users 
           (email, name, wallet_address, profile_image, auth_provider)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userData.email,
            userData.name,
            userData.wallet,
            userData.profileImage,
            userData.provider
          ]
        );

        // 기본 사용자 설정 생성
        await connection.query(
          `INSERT INTO web3auth_user_settings (email) VALUES (?)`,
          [userData.email]
        );
      }

      // 세션 기록
      await connection.query(
        `INSERT INTO web3auth_sessions 
         (email, wallet_address, ip_address, user_agent)
         VALUES (?, ?, ?, ?)`,
        [
          userData.email,
          userData.wallet,
          request.ip || '',
          request.headers.get('user-agent') || ''
        ]
      );

      // 로그인 시도 기록
      await connection.query(
        `INSERT INTO web3auth_login_attempts 
         (email, wallet_address, ip_address, user_agent, status)
         VALUES (?, ?, ?, ?, 'SUCCESS')`,
        [
          userData.email,
          userData.wallet,
          request.ip || '',
          request.headers.get('user-agent') || ''
        ]
      );

      // 트랜잭션 커밋
      await connection.commit();
      
      return NextResponse.json({ 
        success: true,
        email: userData.email,
        message: '사용자 정보가 성공적으로 저장되었습니다.' 
      });
    } catch (error) {
      // 에러 발생시 롤백
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error saving Web3Auth user:', error);
    return NextResponse.json(
      { success: false, message: '사용자 정보 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function PUT(request: NextRequest) {
  const pool = getPool();
  let connection = null;
  try {
    const { email, settings } = await request.json();
    connection = await pool.getConnection();
    await connection.query(
      `UPDATE web3auth_user_settings
       SET default_slippage = ?,
           auto_approve = ?,
           notification_enabled = ?
       WHERE email = ?`,
      [
        settings.defaultSlippage,
        settings.autoApprove,
        settings.notificationEnabled,
        email
      ]
    );
    return NextResponse.json({ 
      success: true,
      message: '사용자 설정이 업데이트되었습니다.' 
    });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json(
      { success: false, message: '설정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}