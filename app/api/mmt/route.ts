// app/api/mmt/pools/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 풀 목록 조회
export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();

    const [rows] = await connection.query(`
      SELECT 
        p.*,
        pc.bid_spread,
        pc.ask_spread,
        pc.min_order_size,
        pc.max_order_size,
        pc.min_order_interval,
        pc.max_position_size,
        pc.auto_rebalance,
        pc.rebalance_threshold,
        pc.enabled
      FROM mmt_pools p
      LEFT JOIN mmt_pool_configs pc ON p.id = pc.pool_id
      ORDER BY p.created_at DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching pools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pools' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// 새 풀 생성
export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const data = await request.json();
    connection = await pool.getConnection();

    await connection.beginTransaction();

    // 풀 정보 삽입
    const [poolResult] = await connection.query(
      `INSERT INTO mmt_pools (
        pool_address, 
        token_a_address, 
        token_a_symbol,
        token_a_decimals,
        token_b_address,
        token_b_symbol,
        token_b_decimals,
        fee_rate,
        creator_wallet
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.poolAddress,
        data.tokenA.address,
        data.tokenA.symbol,
        data.tokenA.decimals,
        data.tokenB.address,
        data.tokenB.symbol,
        data.tokenB.decimals,
        data.feeRate,
        data.creatorWallet
      ]
    );

    // 풀 설정 삽입
    await connection.query(
      `INSERT INTO mmt_pool_configs (
        pool_id,
        bid_spread,
        ask_spread,
        min_order_size,
        max_order_size,
        min_order_interval,
        max_position_size,
        auto_rebalance,
        rebalance_threshold
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        poolResult.insertId,
        data.config.bidSpread,
        data.config.askSpread,
        data.config.minOrderSize,
        data.config.maxOrderSize,
        data.config.minOrderInterval,
        data.config.maxPositionSize,
        data.config.autoRebalance,
        data.config.rebalanceThreshold
      ]
    );

    // 풀 생성 이벤트 로깅
    await connection.query(
      `INSERT INTO mmt_pool_events (
        pool_id,
        event_type,
        description
      ) VALUES (?, 'CREATED', ?)`,
      [
        poolResult.insertId,
        `Pool created with ${data.tokenA.symbol}/${data.tokenB.symbol}`
      ]
    );

    await connection.commit();

    return NextResponse.json({ 
      success: true, 
      poolId: poolResult.insertId 
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating pool:', error);
    return NextResponse.json(
      { error: 'Failed to create pool' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}