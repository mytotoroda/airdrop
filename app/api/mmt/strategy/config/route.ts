// app/api/mmt/strategy/config/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { searchParams } = new URL(request.url);
    const poolId = searchParams.get('poolId');

    if (!poolId) {
      return NextResponse.json(
        { success: false, message: '풀 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    const [configs] = await connection.query(`
      SELECT 
        base_spread,
        bid_adjustment,
        ask_adjustment,
        check_interval,
        min_token_a_trade,
        max_token_a_trade,
        min_token_b_trade,
        max_token_b_trade,
        trade_size_percentage,
        target_ratio,
        rebalance_threshold,
        max_position_size,
        max_slippage,
        stop_loss_percentage,
        emergency_stop,
        enabled,
        min_liquidity,
        max_liquidity
      FROM mmt_pool_configs 
      WHERE pool_id = ?
    `, [poolId]);

    // 설정이 없는 경우 기본값 반환
    const config = configs[0] || {
      base_spread: 0.002, // 0.2%
      bid_adjustment: -0.0005,
      ask_adjustment: 0.0005,
      check_interval: 30,
      min_token_a_trade: 0.1,
      max_token_a_trade: 10,
      min_token_b_trade: 1,
      max_token_b_trade: 1000,
      trade_size_percentage: 0.1, // 10%
      target_ratio: 0.5,
      rebalance_threshold: 0.1, // 10%
      max_position_size: 50000,
      max_slippage: 0.01,
      stop_loss_percentage: 0.05,
      emergency_stop: 0,
      enabled: 0,
      min_liquidity: 1000,
      max_liquidity: 1000000
    };

    return NextResponse.json({
      success: true,
      config: {
        baseSpread: config.base_spread * 100, // 백분율로 변환
        bidAdjustment: config.bid_adjustment * 100,
        askAdjustment: config.ask_adjustment * 100,
        checkInterval: config.check_interval,
        minTokenATrade: config.min_token_a_trade,
        maxTokenATrade: config.max_token_a_trade,
        minTokenBTrade: config.min_token_b_trade,
        maxTokenBTrade: config.max_token_b_trade,
        tradeSizePercentage: config.trade_size_percentage * 100,
        targetRatio: config.target_ratio * 100,
        rebalanceThreshold: config.rebalance_threshold * 100,
        maxPositionSize: config.max_position_size,
        maxSlippage: config.max_slippage * 100,
        stopLossPercentage: config.stop_loss_percentage * 100,
        emergencyStop: Boolean(config.emergency_stop),
        enabled: Boolean(config.enabled),
        minLiquidity: config.min_liquidity,
        maxLiquidity: config.max_liquidity
      }
    });

  } catch (error) {
    console.error('Error fetching strategy config:', error);
    return NextResponse.json(
      { success: false, message: '전략 설정을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const data = await request.json();
    const {
      poolId,
      baseSpread,
      bidAdjustment,
      askAdjustment,
      checkInterval,
      minTokenATrade,
      maxTokenATrade,
      minTokenBTrade,
      maxTokenBTrade,
      tradeSizePercentage,
      targetRatio,
      rebalanceThreshold,
      maxPositionSize,
      maxSlippage,
      stopLossPercentage,
      emergencyStop,
      enabled,
      minLiquidity,
      maxLiquidity,
      walletAddress
    } = data;

    if (!poolId) {
      return NextResponse.json(
        { success: false, message: '풀 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 이전 설정 조회 (변경 이력용)
      const [oldConfig] = await connection.query(
        'SELECT * FROM mmt_pool_configs WHERE pool_id = ?',
        [poolId]
      );

      // 설정 업데이트
      await connection.query(`
        INSERT INTO mmt_pool_configs (
          pool_id,
          base_spread,
          bid_adjustment,
          ask_adjustment,
          check_interval,
          min_token_a_trade,
          max_token_a_trade,
          min_token_b_trade,
          max_token_b_trade,
          trade_size_percentage,
          target_ratio,
          rebalance_threshold,
          max_position_size,
          max_slippage,
          stop_loss_percentage,
          emergency_stop,
          enabled,
          min_liquidity,
          max_liquidity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          base_spread = VALUES(base_spread),
          bid_adjustment = VALUES(bid_adjustment),
          ask_adjustment = VALUES(ask_adjustment),
          check_interval = VALUES(check_interval),
          min_token_a_trade = VALUES(min_token_a_trade),
          max_token_a_trade = VALUES(max_token_a_trade),
          min_token_b_trade = VALUES(min_token_b_trade),
          max_token_b_trade = VALUES(max_token_b_trade),
          trade_size_percentage = VALUES(trade_size_percentage),
          target_ratio = VALUES(target_ratio),
          rebalance_threshold = VALUES(rebalance_threshold),
          max_position_size = VALUES(max_position_size),
          max_slippage = VALUES(max_slippage),
          stop_loss_percentage = VALUES(stop_loss_percentage),
          emergency_stop = VALUES(emergency_stop),
          enabled = VALUES(enabled),
          min_liquidity = VALUES(min_liquidity),
          max_liquidity = VALUES(max_liquidity)
      `, [
        poolId,
        baseSpread / 100,
        bidAdjustment / 100,
        askAdjustment / 100,
        checkInterval,
        minTokenATrade,
        maxTokenATrade,
        minTokenBTrade,
        maxTokenBTrade,
        tradeSizePercentage / 100,
        targetRatio / 100,
        rebalanceThreshold / 100,
        maxPositionSize,
        maxSlippage / 100,
        stopLossPercentage / 100,
        emergencyStop ? 1 : 0,
        enabled ? 1 : 0,
        minLiquidity,
        maxLiquidity
      ]);

      // 변경 이력 기록
      await connection.query(`
        INSERT INTO mmt_pool_config_history (
          pool_id,
          change_type,
          changed_fields,
          old_values,
          new_values,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        poolId,
        oldConfig.length ? 'UPDATED' : 'CREATED',
        JSON.stringify(Object.keys(data)),
        oldConfig.length ? JSON.stringify(oldConfig[0]) : null,
        JSON.stringify(data),
        walletAddress
      ]);

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: '전략 설정이 성공적으로 저장되었습니다.'
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error updating strategy config:', error);
    return NextResponse.json(
      { success: false, message: '전략 설정 저장에 실패했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}