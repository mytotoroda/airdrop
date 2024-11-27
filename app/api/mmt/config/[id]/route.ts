// app/api/mmt/config/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 로깅 유틸리티 함수
const logRequestDetails = (method: string, params: any, body?: any) => {
  console.log('\n--------------------');
  console.log(`[${new Date().toISOString()}] ${method} Request`);
  console.log('Parameters:', params);
  if (body) console.log('Request Body:', body);
  console.log('--------------------\n');
};

const logDBOperation = (operation: string, query: string, params: any) => {
  console.log('\n--------------------');
  console.log(`[${new Date().toISOString()}] Database Operation: ${operation}`);
  console.log('Query:', query);
  console.log('Parameters:', params);
  console.log('--------------------\n');
};

const logError = (method: string, error: any) => {
  console.error('\n--------------------');
  console.error(`[${new Date().toISOString()}] Error in ${method}:`);
  console.error('Error message:', error.message);
  console.error('Stack trace:', error.stack);
  console.error('--------------------\n');
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  logRequestDetails('GET', params);
  
  const pool = getPool();
  let connection = null;
  
  try {
    const poolId = params.id;
    //console.log('[Step 1] Received pool ID:', poolId);

    if (!poolId) {
      //console.log('[Error] Pool ID is missing');
      return NextResponse.json(
        { success: false, message: 'Pool ID is required' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    //console.log('[Step 2] Database connection established');

    const query = `
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
    `;

    //logDBOperation('SELECT', query, [poolId]);

    const [poolConfig] = await connection.query(query, [poolId]);
    //console.log('[Step 3] Query executed. Result:', poolConfig);

    if (!poolConfig || !poolConfig.length) {
      //console.log('[Step 4] No config found. Returning default values');
      const defaultConfig = {
        baseSpread: 0.002,
        bidAdjustment: -0.0005,
        askAdjustment: 0.0005,
        checkInterval: 30,
        minTokenATrade: 0.1,
        maxTokenATrade: 100,
        minTokenBTrade: 0.1,
        maxTokenBTrade: 100,
        tradeSizePercentage: 0.1,
        targetRatio: 0.5,
        rebalanceThreshold: 0.1,
        maxPositionSize: 1000,
        maxSlippage: 0.01,
        stopLossPercentage: 0.05,
        emergencyStop: false,
        enabled: false,
        minLiquidity: 0,
        maxLiquidity: 0
      };
      //console.log('Default config:', defaultConfig);
      return NextResponse.json(defaultConfig);
    }

    const config = poolConfig[0];
    //console.log('[Step 5] Raw config from database:', config);

    // ConfigPanel 컴포넌트가 기대하는 형식으로 데이터 변환
    const formattedConfig = {
      baseSpread: config.base_spread || 0.002,
      bidAdjustment: config.bid_adjustment || -0.0005,
      askAdjustment: config.ask_adjustment || 0.0005,
      checkInterval: config.check_interval || 30,
      minTokenATrade: config.min_token_a_trade || 0.1,
      maxTokenATrade: config.max_token_a_trade || 100,
      minTokenBTrade: config.min_token_b_trade || 0.1,
      maxTokenBTrade: config.max_token_b_trade || 100,
      tradeSizePercentage: config.trade_size_percentage || 0.1,
      targetRatio: config.target_ratio || 0.5,
      rebalanceThreshold: config.rebalance_threshold || 0.1,
      maxPositionSize: config.max_position_size || 1000,
      maxSlippage: config.max_slippage || 0.01,
      stopLossPercentage: config.stop_loss_percentage || 0.05,
      emergencyStop: !!config.emergency_stop,
      enabled: !!config.enabled,
      minLiquidity: config.min_liquidity || 0,
      maxLiquidity: config.max_liquidity || 0
    };

    //console.log('[Step 6] Formatted config:', formattedConfig);
    return NextResponse.json(formattedConfig);

  } catch (error) {
    logError('GET', error);
    return NextResponse.json(
      { success: false, message: '풀 설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
      //console.log('[Final] Database connection released');
    }
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  logRequestDetails('PUT', params);
  
  const pool = getPool();
  let connection = null;
  
  try {
    const poolId = params.id;
    const config = await request.json();
    //console.log('[Step 1] Received update request');
    //console.log('Pool ID:', poolId);
    //console.log('Config:', config);

    if (!poolId || !config) {
      //console.log('[Error] Missing required data');
      return NextResponse.json(
        { success: false, message: '풀 ID와 설정 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    //console.log('[Step 2] Transaction started');

    // 기존 설정 조회
    const [oldConfigs] = await connection.query(`
      SELECT * FROM mmt_pool_configs WHERE pool_id = ?
    `, [poolId]);
    //console.log('[Step 3] Current config:', oldConfigs[0] || 'No existing config');

    const oldConfig = oldConfigs.length > 0 ? oldConfigs[0] : null;

    // 설정 업데이트 쿼리 준비
    const updateQuery = `
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
    `;

    const updateParams = [
      poolId,
      config.baseSpread,
      config.bidAdjustment,
      config.askAdjustment,
      config.checkInterval,
      config.minTokenATrade,
      config.maxTokenATrade,
      config.minTokenBTrade,
      config.maxTokenBTrade,
      config.tradeSizePercentage,
      config.targetRatio,
      config.rebalanceThreshold,
      config.maxPositionSize,
      config.maxSlippage,
      config.stopLossPercentage,
      config.emergencyStop,
      config.enabled,
      config.minLiquidity,
      config.maxLiquidity
    ];

    //logDBOperation('UPDATE', updateQuery, updateParams);

    // 설정 업데이트 실행
    const updateResult = await connection.query(updateQuery, updateParams);
    //console.log('[Step 4] Update result:', updateResult);

    // 변경 이력 기록
    const historyQuery = `
      INSERT INTO mmt_pool_config_history (
        pool_id,
        change_type,
        changed_fields,
        new_values,
        created_at
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const historyParams = [
      poolId,
      'PARAMS_UPDATED',
      JSON.stringify(Object.keys(config)),
      JSON.stringify(config)
    ];

    //logDBOperation('INSERT History', historyQuery, historyParams);
    await connection.query(historyQuery, historyParams);

    // 이벤트 기록
    const eventQuery = `
      INSERT INTO mmt_pool_events (
        pool_id,
        event_type,
        severity,
        description,
        event_data
      ) VALUES (?, ?, ?, ?, ?)
    `;

    const eventParams = [
      poolId,
      'CONFIG_CHANGED',
      'INFO',
      'Pool configuration updated',
      JSON.stringify({
        enabled: config.enabled,
        emergencyStop: config.emergencyStop
      })
    ];

    //logDBOperation('INSERT Event', eventQuery, eventParams);
    await connection.query(eventQuery, eventParams);

    await connection.commit();
    //console.log('[Step 5] Transaction committed successfully');

    return NextResponse.json({
      success: true,
      message: '풀 설정이 성공적으로 업데이트되었습니다.'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
      //console.log('[Error] Transaction rolled back');
    }
    logError('PUT', error);
    return NextResponse.json(
      { success: false, message: '풀 설정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
      //console.log('[Final] Database connection released');
    }
  }
}