// app/api/airdrop/get-campaigns/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageParams {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: PageParams
) {
  console.log('Received params:', params); // params 값 로깅
  console.log('Campaign ID:', params.id); // ID 값 로깅

  if (!params.id) {
    return NextResponse.json(
      { message: '캠페인 ID가 필요합니다.' },
      { status: 400 }
    );
  }

  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT * FROM airdrop_campaigns 
       WHERE id = ? AND status IN ('PENDING', 'IN_PROGRESS')`,
      [params.id]
    );

    console.log('Query result:', rows); // 쿼리 결과 로깅

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { message: '캠페인을 찾을 수 없거나 이미 완료된 캠페인입니다.' },
        { status: 404 }
      );
    }

    console.log('Campaign found:', rows[0]);
    
    return NextResponse.json(rows[0], {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: '캠페인 조회 중 오류가 발생했습니다.', error: String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}