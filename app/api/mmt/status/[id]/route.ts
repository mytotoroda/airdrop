// app/api/mmt/status/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { Connection } from '@solana/web3.js';
import { MarketMaker } from '@/lib/mmt/marketMaker';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  let connection = null;

  try {
    const poolId = params.id;

    connection = await pool.getConnection();

    // 1. DB에서 풀 설정 및 상태 조회
    const [[poolConfig]] = await connection.query(
      `SELECT 
        p.*,
        c.enabled,
        c.bid_spread,
        c.ask_spread,
        c.min_order_interval
       FROM mmt_pools p
       LEFT JOIN mmt_pool_configs c ON p.id = c.pool_id
       WHERE p.id = ?`,
      [poolId]
    );

    if (!poolConfig) {
      return NextResponse.json({
        success: false,
        message: 'Pool not found'
      }, { status: 404 });
    }

    // 2. 최근 실행 로그 조회 (마지막 1분 이내)
    const [[lastExecution]] = await connection.query(
      `SELECT * FROM mmt_pool_events 
       WHERE pool_id = ? 
       AND event_type = 'EXECUTION'
       AND created_at > DATE_SUB(NOW(), INTERVAL 1 MINUTE)
       ORDER BY created_at DESC 
       LIMIT 1`,
      [poolId]
    );

    // 3. 상태 정보 구성
    const statusInfo = {
      poolId: poolConfig.id,
      isActive: Boolean(poolConfig.enabled),
      lastExecution: lastExecution ? {
        timestamp: lastExecution.created_at,
        details: JSON.parse(lastExecution.description)
      } : null,
      config: {
        bidSpread: poolConfig.bid_spread,
        askSpread: poolConfig.ask_spread,
        interval: poolConfig.min_order_interval
      }
    };

    // 4. 응답 반환
    return NextResponse.json({
      success: true,
      data: statusInfo
    });

  } catch (error) {
    console.error('Error checking MM status:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to check MM status'
    }, { status: 500 });

  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 에러 발생 시 로깅을 위한 POST 엔드포인트 추가 (선택사항)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  let connection = null;

  try {
    const poolId = params.id;
    const { error } = await request.json();

    connection = await pool.getConnection();

    // 에러 로깅
    await connection.query(
      `INSERT INTO mmt_pool_events (
        pool_id,
        event_type,
        description
      ) VALUES (?, 'ERROR', ?)`,
      [
        poolId,
        JSON.stringify({
          error: error instanceof Error ? error.message : error,
          timestamp: new Date()
        })
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully'
    });

  } catch (error) {
    console.error('Error logging MM error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to log error'
    }, { status: 500 });

  } finally {
    if (connection) {
      connection.release();
    }
  }
}