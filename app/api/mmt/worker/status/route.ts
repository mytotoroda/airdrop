// app/api/mmt/worker/status/route.ts
import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { RebalanceWorker } from '@/lib/mmt/rebalanceWorker';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbPool = getPool();
  let connection = null;

  try {
    connection = await dbPool.getConnection();
    
    // 활성화된 풀 수 조회
    const [[{ activePoolsCount }]] = await connection.query(
      `SELECT COUNT(*) as activePoolsCount
       FROM mmt_pools m
       JOIN mmt_pool_configs c ON m.id = c.pool_id
       WHERE m.status = 'ACTIVE' AND c.enabled = true`
    );

    // 대기 중인 리밸런싱 수 조회
    const [[{ pendingRebalances }]] = await connection.query(
      `SELECT COUNT(*) as pendingRebalances
       FROM mmt_pools m
       JOIN mmt_pool_configs c ON m.id = c.pool_id
       WHERE m.status = 'ACTIVE' 
       AND c.enabled = true
       AND m.rebalance_needed = true`
    );

    // 마지막 오류 조회
    const [[lastError]] = await connection.query(
      `SELECT description, created_at
       FROM mmt_pool_events
       WHERE event_type = 'ERROR'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    const worker = RebalanceWorker.getInstance();

    return NextResponse.json({
      success: true,
      status: {
        isRunning: worker.isRunning(),
        lastCheck: worker.getLastCheckTime(),
        activePoolsCount,
        pendingRebalances,
        lastError: lastError?.description
      }
    });

  } catch (error) {
    console.error('Worker status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '워커 상태 조회 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}