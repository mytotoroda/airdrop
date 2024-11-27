import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();

    // 해당 캠페인의 모든 수신자 정보 조회
    const [recipients] = await connection.query(
      `SELECT 
        r.id,
        r.campaign_id,
        r.user_id,
        r.wallet_address,
        r.amount,
        r.status,
        r.tx_signature,
        r.error_message,
        r.created_at,
        r.updated_at
      FROM airdrop_recipients r
      WHERE r.campaign_id = ?
      ORDER BY user_id`,
      [params.campaignId]
    );

    return NextResponse.json(recipients);

  } catch (error) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json(
      { error: '수신자 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    );

  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// PUT endpoint for updating a recipient
export async function PUT(
  request: NextRequest,
  { params }: { params: { recipientId: string } }
) {
  const pool = getPool();
  let connection = null;

  try {
    const data = await request.json();
    connection = await pool.getConnection();

    await connection.query(
      `UPDATE airdrop_recipients 
      SET 
        wallet_address = ?,
        amount = ?,
        user_id = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        data.wallet_address,
        data.amount,
        data.user_id,
        data.status,
        params.recipientId
      ]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating recipient:', error);
    return NextResponse.json(
      { error: '수신자 정보 업데이트에 실패했습니다.' },
      { status: 500 }
    );

  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// DELETE endpoint for removing a recipient
export async function DELETE(
  request: NextRequest,
  { params }: { params: { recipientId: string } }
) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();

    await connection.query(
      'DELETE FROM airdrop_recipients WHERE id = ?',
      [params.recipientId]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting recipient:', error);
    return NextResponse.json(
      { error: '수신자 삭제에 실패했습니다.' },
      { status: 500 }
    );

  } finally {
    if (connection) {
      connection.release();
    }
  }
}