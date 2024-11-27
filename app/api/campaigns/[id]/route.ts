// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';  // getPool 임포트

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM airdrop_campaigns WHERE id = ?',
      [params.id]
    );

    if ((rows as any[]).length === 0) {
      return NextResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      );
    }

    const response = NextResponse.json(rows[0]);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Error fetching campaign', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
// PUT - 캠페인 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  let connection: PoolConnection | null = null;

  try {
    const data = await request.json();
    const {
      title,
      token_address,
      token_name,
      token_symbol,
      amount,
      total_recipients,
      completed_recipients,
      status
    } = data;

    connection = await pool.getConnection();
    const [result] = await connection.execute(
      `UPDATE airdrop_campaigns 
       SET title = ?,
           token_address = ?,
           token_name = ?,
           token_symbol = ?,
           amount = ?,
           total_recipients = ?,
           completed_recipients = ?,
           status = ?
       WHERE id = ?`,
      [title, token_address, token_name, token_symbol, amount, total_recipients,completed_recipients,status, params.id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Campaign updated successfully' });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Error updating campaign', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// DELETE - 캠페인 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  let connection: PoolConnection | null = null;

  try {
    connection = await pool.getConnection();
    const [result] = await connection.execute(
      'DELETE FROM airdrop_campaigns WHERE id = ?',
      [params.id]
    );

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Campaign deleted successfully' });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Error deleting campaign', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}