// app/api/mmt/positions/rebalance/[poolId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { raydiumService } from '@/lib/mmt/raydium';
import { calculateRebalanceAction, executeRebalance } from '@/lib/mmt/rebalance';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { poolId: string } }
) {
  const dbPool = getPool();
  let connection = null;

  try {
    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    // 1. 풀 정보 조회
    const [[pool]] = await connection.query(
      `SELECT m.*, c.* 
       FROM mmt_pools m
       LEFT JOIN mmt_pool_configs c ON m.id = c.pool_id
       WHERE m.id = ? AND m.status = 'ACTIVE'`,
      [params.poolId]
    );

    if (!pool) {
      return NextResponse.json(
        { success: false, message: '풀을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 2. 현재 풀 상태 확인
    const sdk = await raydiumService.initializeSdk();
    const poolData = await sdk.clmm.getRpcClmmPoolInfos({
      poolIds: [pool.pool_address],
    });

    if (!poolData || !poolData[pool.pool_address]) {
      throw new Error('온체인 풀 정보를 가져올 수 없습니다.');
    }

    const poolInfo = poolData[pool.pool_address];

    // 3. 리밸런싱 액션 계산
    const rebalanceAction = await calculateRebalanceAction({
      poolAddress: pool.pool_address,
      targetRatio: pool.target_ratio || 0.5,
      currentPrice: poolInfo.currentPrice,
      tokenAAmount: pool.token_a_amount,
      tokenBAmount: pool.token_b_amount,
      maxSlippage: pool.max_slippage || 0.01,
      minTradeSize: pool.min_trade_size,
      maxTradeSize: pool.max_trade_size
    });

    if (!rebalanceAction) {
      return NextResponse.json({
        success: false,
        message: '현재 리밸런싱이 필요하지 않습니다.'
      });
    }

    // 4. 리밸런싱 실행
    const result = await executeRebalance(
      sdk,
      pool.pool_address,
      rebalanceAction
    );

    if (!result.success) {
      throw new Error(result.error || '리밸런싱 실행 실패');
    }

    // 5. 트랜잭션 기록
    await connection.query(
      `INSERT INTO mmt_transactions (
        pool_id,
        action_type,
        direction,
        amount,
        price,
        tx_signature,
        status
      ) VALUES (?, 'REBALANCE', ?, ?, ?, ?, 'SUCCESS')`,
      [
        pool.id,
        rebalanceAction.type,
        rebalanceAction.amount,
        rebalanceAction.expectedPrice,
        result.signature
      ]
    );

    // 6. 이벤트 기록
    await connection.query(
      `INSERT INTO mmt_pool_events (
        pool_id,
        event_type,
        description
      ) VALUES (?, 'REBALANCED', ?)`,
      [
        pool.id,
        `Manual rebalance executed: ${rebalanceAction.type} ${rebalanceAction.amount} tokens at ${rebalanceAction.expectedPrice}`
      ]
    );

    await connection.commit();

    return NextResponse.json({ 
      success: true, 
      message: '리밸런싱이 성공적으로 실행되었습니다.',
      data: {
        action: rebalanceAction,
        transaction: result.signature
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    
    console.error('Rebalance error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '리밸런싱 처리 중 오류가 발생했습니다.',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}