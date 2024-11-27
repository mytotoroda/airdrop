// app/api/airdrop/updatestatus/[campaignId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface UpdateStatusBody {
  signature: string;
  recipientIds: number[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    const campaignId = params.campaignId;
    const body: UpdateStatusBody = await request.json();
    const { signature, recipientIds } = body;

    if (!signature || !recipientIds || !recipientIds.length) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Start transaction
    await connection.beginTransaction();

    // Update recipients status
    const updateQuery = `
      UPDATE airdrop_recipients 
      SET 
        status = 'COMPLETED',
        tx_signature = ?,
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE 
        campaign_id = ? 
        AND id IN (?)
    `;

    const [updateResult] = await connection.query(updateQuery, [
      signature,
      campaignId,
      recipientIds
    ]);

    // Get progress statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
      FROM airdrop_recipients
      WHERE campaign_id = ?
    `;

    const [statsRows] = await connection.query(statsQuery, [campaignId]);
    const stats = statsRows[0];

    // Commit transaction
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: '상태가 성공적으로 업데이트되었습니다.',
      progress: {
        total: Number(stats.total) || 0,
        completed: Number(stats.completed) || 0,
        failed: Number(stats.failed) || 0
      }
    });

  } catch (error) {
    // Rollback on error
    await connection.rollback();

    console.error('Status update error:', error);
    
    return NextResponse.json(
      { 
        error: '상태 업데이트 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );

  } finally {
    // Release connection
    connection.release();
  }
}

// Handle batch failure
export async function PUT(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    const campaignId = params.campaignId;
    const body = await request.json();
    const { recipientIds, errorMessage } = body;

    if (!recipientIds || !recipientIds.length) {
      return NextResponse.json(
        { error: '수신자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Start transaction
    await connection.beginTransaction();

    // Update failed recipients
    const updateQuery = `
      UPDATE airdrop_recipients 
      SET 
        status = 'FAILED',
        error_message = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE 
        campaign_id = ? 
        AND id IN (?)
    `;

    const [updateResult] = await connection.query(updateQuery, [
      errorMessage || 'Transaction failed',
      campaignId,
      recipientIds
    ]);

    // Get updated statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed
      FROM airdrop_recipients
      WHERE campaign_id = ?
    `;

    const [statsRows] = await connection.query(statsQuery, [campaignId]);
    const stats = statsRows[0];

    // Commit transaction
    await connection.commit();

    return NextResponse.json({
      success: true,
      message: '실패 상태가 업데이트되었습니다.',
      progress: {
        total: Number(stats.total) || 0,
        completed: Number(stats.completed) || 0,
        failed: Number(stats.failed) || 0
      }
    });

  } catch (error) {
    // Rollback on error
    await connection.rollback();

    console.error('Failure update error:', error);
    
    return NextResponse.json(
      { 
        error: '실패 상태 업데이트 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );

  } finally {
    // Release connection
    connection.release();
  }
}