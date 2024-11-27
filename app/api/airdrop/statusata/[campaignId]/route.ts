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
    
    // ATA 생성 상태 조회
    const [status] = await connection.execute(
      `SELECT 
         COUNT(r.id) as total_wallets,
         SUM(CASE WHEN r.ata_address IS NOT NULL THEN 1 ELSE 0 END) as completed_count,
         SUM(CASE WHEN r.ata_address IS NULL THEN 1 ELSE 0 END) as pending_count
       FROM airdrop_recipients r
       WHERE r.campaign_id = ?`,
      [params.campaignId]
    );

    return NextResponse.json(status[0]);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: 'ATA 상태 조회 중 오류가 발생했습니다.', error: String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}