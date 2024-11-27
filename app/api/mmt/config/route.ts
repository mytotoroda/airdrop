// app/api/mmt/config/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const poolId = searchParams.get('poolId');

    if (!poolId) {
      return NextResponse.json(
        { success: false, message: 'Pool ID is required' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // 풀 설정 정보 조회
    const [poolConfig] = await connection.query(`
      SELECT 
        p.id as pool_id,
        p.pool_address,
        p.token_a_symbol,
        p.token_b_symbol,
        p.fee_rate,
        p.status,
        pc.*,
        pos.token_a_amount,
        pos.token_b_amount,
        pos.total_value_usd,
        pos.token_ratio,
        pos.fees_earned_usd,
        pos.fee_apy,
        COALESCE(
          (SELECT created_at 
           FROM mmt_pos_rebalance_history 
           WHERE pool_id = p.id 
           ORDER BY created_at DESC 
           LIMIT 1
          ), NULL
        ) as last_rebalance_time
      FROM mmt_pools p
      LEFT JOIN mmt_pool_configs pc ON p.id = pc.pool_id
      LEFT JOIN mmt_pos_current pos ON p.id = pos.pool_id
      WHERE p.id = ?
    `, [poolId]);

    if (!poolConfig || !poolConfig.length) {
      return NextResponse.json(
        { success: false, message: '풀 설정을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const config = poolConfig[0];

    // 현재 알림 설정 조회
    const [alerts] = await connection.query(`
      SELECT 
        id,
        alert_type,
        threshold_value,
        comparison,
        is_active,
        notification_method,
        notification_target,
        last_triggered_at,
        check_interval,
        consecutive_triggers
      FROM mmt_pos_alerts
      WHERE pool_id = ?
      AND is_active = 1
    `, [poolId]);

    // 최근 설정 변경 이력 조회
    const [configHistory] = await connection.query(`
      SELECT 
        change_type,
        changed_fields,
        old_values,
        new_values,
        created_at,
        created_by
      FROM mmt_pool_config_history
      WHERE pool_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `, [poolId]);

    return NextResponse.json({
      success: true,
      data: {
        pool: {
          id: config.pool_id,
          address: config.pool_address,
          tokenA: config.token_a_symbol,
          tokenB: config.token_b_symbol,
          feeRate: config.fee_rate,
          status: config.status
        },
        trading: {
          baseSpread: config.base_spread || 0.002,
          bidAdjustment: config.bid_adjustment || -0.0005,
          askAdjustment: config.ask_adjustment || 0.0005,
          checkInterval: config.check_interval || 30,
          minTokenATrade: config.min_token_a_trade || 0.1,
          maxTokenATrade: config.max_token_a_trade || 10,
          minTokenBTrade: config.min_token_b_trade || 1,
          maxTokenBTrade: config.max_token_b_trade || 1000,
          tradeSizePercentage: config.trade_size_percentage || 0.1
        },
        position: {
          targetRatio: config.target_ratio || 0.5,
          rebalanceThreshold: config.rebalance_threshold || 0.1,
          maxPositionSize: config.max_position_size || 1000,
          maxSlippage: config.max_slippage || 0.01,
          stopLossPercentage: config.stop_loss_percentage || 0.05,
          minLiquidity: config.min_liquidity || 0,
          maxLiquidity: config.max_liquidity || 0,
          currentTokenAAmount: config.token_a_amount,
          currentTokenBAmount: config.token_b_amount,
          currentValueUsd: config.total_value_usd,
          feesEarned: config.fees_earned_usd,
          feeApy: config.fee_apy
        },
        status: {
          enabled: !!config.enabled,
          emergencyStop: !!config.emergency_stop,
          lastRebalance: config.last_rebalance_time,
          currentTokenRatio: config.token_ratio
        },
        alerts: alerts || [],
        recentChanges: configHistory || []
      }
    });

  } catch (error) {
    console.error('Error fetching pool config:', error);
    return NextResponse.json(
      { success: false, message: '풀 설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}