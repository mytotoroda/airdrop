// app/api/amm/tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 토큰 목록 조회
export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    
    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const verifiedOnly = searchParams.get('verified') === 'true';

    // 기본 쿼리
    let query = 'SELECT * FROM amm_tokens WHERE 1=1';
    const params = [];

    // 검색어가 있는 경우
    if (search) {
      query += ' AND (symbol LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // verified 필터링
    if (verifiedOnly) {
      query += ' AND is_verified = true';
    }

    query += ' ORDER BY is_verified DESC, symbol ASC';

    const [tokens] = await connection.query(query, params);

    return NextResponse.json({ 
      success: true, 
      tokens 
    });

  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { success: false, message: '토큰 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 새 토큰 추가
export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { 
      mintAddress,
      symbol,
      name,
      decimals,
      logoUri,
      isVerified = false 
    } = await request.json();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 중복 체크
      const [existing] = await connection.query(
        'SELECT * FROM amm_tokens WHERE mint_address = ?',
        [mintAddress]
      );

      if (existing.length > 0) {
        throw new Error('이미 등록된 토큰입니다.');
      }

      // 새 토큰 추가
      const [result] = await connection.query(
        `INSERT INTO amm_tokens (
          mint_address,
          symbol,
          name,
          decimals,
          logo_uri,
          is_verified
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [mintAddress, symbol, name, decimals, logoUri, isVerified]
      );

      await connection.commit();

      return NextResponse.json({ 
        success: true, 
        message: '토큰이 성공적으로 등록되었습니다.',
        tokenId: result.insertId
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Error adding token:', error);
    return NextResponse.json(
      { success: false, message: error.message || '토큰 등록에 실패했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 토큰 정보 업데이트
export async function PUT(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { 
      mintAddress,
      symbol,
      name,
      decimals,
      logoUri,
      isVerified 
    } = await request.json();

    connection = await pool.getConnection();

    const [result] = await connection.query(
      `UPDATE amm_tokens 
       SET symbol = ?,
           name = ?,
           decimals = ?,
           logo_uri = ?,
           is_verified = ?
       WHERE mint_address = ?`,
      [symbol, name, decimals, logoUri, isVerified, mintAddress]
    );

    if (result.affectedRows === 0) {
      throw new Error('토큰을 찾을 수 없습니다.');
    }

    return NextResponse.json({ 
      success: true, 
      message: '토큰 정보가 업데이트되었습니다.' 
    });

  } catch (error: any) {
    console.error('Error updating token:', error);
    return NextResponse.json(
      { success: false, message: error.message || '토큰 정보 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}