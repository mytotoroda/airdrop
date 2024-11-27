import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { campaignId, recipients } = await request.json();
    connection = await pool.getConnection();

    // 트랜잭션 시작
    await connection.beginTransaction();

    try {
      // 기존 PENDING 상태의 데이터 삭제 (선택사항)
      await connection.query(
        'DELETE FROM airdrop_recipients WHERE campaign_id = ? AND status = ?',
        [campaignId, 'PENDING']
      );

      // 새 데이터 삽입
      for (const recipient of recipients) {
        await connection.query(
          `INSERT INTO airdrop_recipients 
          (campaign_id, wallet_address, amount, user_id, status) 
          VALUES (?, ?, ?, ?, ?)`,
          [
            campaignId, 
            recipient.wallet_address,
            recipient.amount,
            recipient.user_id,
            'PENDING'
          ]
        );
      }

      // 트랜잭션 커밋
      await connection.commit();

      return NextResponse.json({ 
        success: true, 
        message: `${recipients.length}개의 주소가 등록되었습니다.` 
      });

    } catch (error) {
      // 에러 발생시 롤백
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error uploading recipients:', error);
    return NextResponse.json(
      { success: false, message: '주소록 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}