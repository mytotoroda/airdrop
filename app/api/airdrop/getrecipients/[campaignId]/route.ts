// app/api/airdrop/get-recipients/[campaignId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageParams {
  params: {
    campaignId: string;
  };
}

const BATCH_SIZE = 100;

export async function GET(
  request: NextRequest,
  { params }: PageParams
) {
  console.log('Fetching recipients for campaign:', params.campaignId);

  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT * FROM airdrop_recipients 
       WHERE campaign_id = ? 
       AND (status = 'PENDING' OR status = 'FAILED')
       ORDER BY id ASC
       LIMIT ?`,
      [params.campaignId, BATCH_SIZE]
    );

    console.log(`Found ${(rows as any[]).length} recipients to process`);
    
    return NextResponse.json(rows, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: '수신자 조회 중 오류가 발생했습니다.', error: String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}