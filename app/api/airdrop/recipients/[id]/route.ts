import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PUT 핸들러
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('PUT request received for id:', params.id); // 디버깅용

  const pool = getPool();
  let connection = null;

  try {
    const data = await request.json();
    console.log('Received data:', data); // 디버깅용

    connection = await pool.getConnection();

    const [result] = await connection.query(
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
        params.id
      ]
    );

    console.log('Query result:', result); // 디버깅용

    return NextResponse.json({ 
      success: true,
      message: '수신자 정보가 업데이트되었습니다.'
    });

  } catch (error) {
    console.error('Error in PUT handler:', error); // 디버깅용
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

// DELETE 핸들러
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('DELETE request received for id:', params.id); // 디버깅용

  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();

    const [result] = await connection.query(
      'DELETE FROM airdrop_recipients WHERE id = ?',
      [params.id]
    );

    console.log('Query result:', result); // 디버깅용

    return NextResponse.json({ 
      success: true,
      message: '수신자가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Error in DELETE handler:', error); // 디버깅용
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