// app/api/mmt/wallets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: 지갑 목록 조회
export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    
    const [wallets] = await connection.query(
      `SELECT *  
      FROM mmt_wallets
      ORDER BY created_at DESC`
    );

    return NextResponse.json({
      success: true,
      wallets
    });

  } catch (error) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '지갑 목록을 불러오는데 실패했습니다.' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// POST: 새 지갑 추가
export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { name, address } = await request.json();

    // 입력값 검증
    if (!name || !address) {
      return NextResponse.json(
        { 
          success: false, 
          message: '지갑 이름과 주소는 필수입니다.' 
        },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 중복 지갑 확인
    const [existing] = await connection.query(
      'SELECT id FROM mmt_wallets WHERE address = ?',
      [address]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: '이미 등록된 지갑 주소입니다.' 
        },
        { status: 400 }
      );
    }

    // 새 지갑 추가
    await connection.query(
      `INSERT INTO mmt_wallets (name, address, status) VALUES (?, ?, ?)`,
      [name, address, 'active']
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: '지갑이 성공적으로 추가되었습니다.'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error adding wallet:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '지갑 추가에 실패했습니다.' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}