// app/api/airdrop/status/[campaignId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    
    // 캠페인 상태 조회
    const [campaign] = await connection.execute(
      `SELECT 
         c.*,
         COUNT(r.id) as total_wallets,
         SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
         SUM(CASE WHEN r.status IN ('PENDING', 'FAILED') THEN 1 ELSE 0 END) as pending_count,
         SUM(r.amount) as total_amount
       FROM airdrop_campaigns c
       LEFT JOIN airdrop_recipients r ON c.id = r.campaign_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [params.campaignId]
    );

    return NextResponse.json(campaign[0]);

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '상태 조회 중 오류가 발생했습니다.', error: String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}