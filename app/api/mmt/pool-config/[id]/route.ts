// app/api/mmt/pool-config/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  let connection = null;

  //console.log('\n[GET /api/mmt/pool-config] Start');
   console.log('Pool ID:', params.id);

  try {
    const poolId = params.id;
    connection = await pool.getConnection();
    //console.log('\nDB Connection established');

    const [config] = await connection.query(`
      SELECT pc.*
      FROM mmt_pool_configs pc
      WHERE pc.pool_id = ?
    `, [poolId]);

    //console.log('\nQuery result:', JSON.stringify(config, null, 2));

    if (!config || config.length === 0) {
      console.log('\nNo config found for pool ID:', poolId);
      return NextResponse.json(
        { success: false, message: '풀 설정을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    console.log('\nReturning config for pool ID:', poolId);
    return NextResponse.json({ success: true, config: config[0] });

  } catch (error) {
    console.error('\n[ERROR] Fetch failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });

    return NextResponse.json(
      { success: false, message: '풀 설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
      console.log('\nDB Connection released');
    }
    console.log('[GET /api/mmt/pool-config] End\n');
  }
}


export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  let connection = null;
  
  console.log('\n[PUT /api/mmt/pool-config] Start');
  console.log('Pool ID:', params.id);

  try {
    const poolId = params.id;
    const receivedConfig = await request.json();
    
    console.log('\nReceived Config:', JSON.stringify(receivedConfig, null, 2));

    connection = await pool.getConnection();
    console.log('\nDB Connection established');

    // 기존 설정 조회
    const [existingConfig] = await connection.query(`
      SELECT * FROM mmt_pool_configs WHERE pool_id = ?
    `, [poolId]);

    const config = {
      ...existingConfig[0],
      base_spread: Number(receivedConfig.base_spread || existingConfig[0].base_spread || 0),
      bid_adjustment: Number(receivedConfig.bid_adjustment || existingConfig[0].bid_adjustment || 0),
      ask_adjustment: Number(receivedConfig.ask_adjustment || existingConfig[0].ask_adjustment || 0),
      check_interval: Number(receivedConfig.check_interval || existingConfig[0].check_interval || 30),
      min_token_a_trade: Number(receivedConfig.min_token_a_trade || existingConfig[0].min_token_a_trade || 0),
      max_token_a_trade: Number(receivedConfig.max_token_a_trade || existingConfig[0].max_token_a_trade || 0),
      min_token_b_trade: Number(receivedConfig.min_token_b_trade || existingConfig[0].min_token_b_trade || 0),
      max_token_b_trade: Number(receivedConfig.max_token_b_trade || existingConfig[0].max_token_b_trade || 0),
      trade_size_percentage: Number(receivedConfig.trade_size_percentage || existingConfig[0].trade_size_percentage || 0),
      target_ratio: Number(receivedConfig.target_ratio || existingConfig[0].target_ratio || 0.5),
      rebalance_threshold: Number(receivedConfig.rebalance_threshold || existingConfig[0].rebalance_threshold || 0),
      max_slippage: Number(receivedConfig.max_slippage || existingConfig[0].max_slippage || 0),
      stop_loss_percentage: Number(receivedConfig.stop_loss_percentage || existingConfig[0].stop_loss_percentage || 0),
      emergency_stop: receivedConfig.emergency_stop ? 1 : 0,
      enabled: receivedConfig.enabled ? 1 : 0
    };

    console.log('\nMerged Config:', JSON.stringify(config, null, 2));

    await connection.beginTransaction();
    console.log('Transaction started');

    const updateQuery = `
      UPDATE mmt_pool_configs 
      SET 
        base_spread = ?,
        bid_adjustment = ?,
        ask_adjustment = ?,
        check_interval = ?,
        min_token_a_trade = ?,
        max_token_a_trade = ?,
        min_token_b_trade = ?,
        max_token_b_trade = ?,
        trade_size_percentage = ?,
        target_ratio = ?,
        rebalance_threshold = ?,
        max_slippage = ?,
        stop_loss_percentage = ?,
        emergency_stop = ?,
        enabled = ?
      WHERE pool_id = ?
    `;

    const updateValues = [
      config.base_spread,
      config.bid_adjustment,
      config.ask_adjustment,
      config.check_interval,
      config.min_token_a_trade,
      config.max_token_a_trade,
      config.min_token_b_trade,
      config.max_token_b_trade,
      config.trade_size_percentage,
      config.target_ratio,
      config.rebalance_threshold,
      config.max_slippage,
      config.stop_loss_percentage,
      config.emergency_stop,
      config.enabled,
      poolId
    ];

    console.log('\nExecuting update with values:', JSON.stringify(updateValues, null, 2));

    const [updateResult] = await connection.query(updateQuery, updateValues);
    console.log('\nUpdate result:', updateResult);

    console.log('\nInserting config history');
    await connection.query(`
      INSERT INTO mmt_pool_config_history 
      (pool_id, change_type, changed_fields, new_values)
      VALUES (?, 'UPDATED', 'All', ?)
    `, [poolId, JSON.stringify(config)]);

    await connection.commit();
    console.log('\nTransaction committed');

    return NextResponse.json({ 
      success: true, 
      message: '풀 설정이 업데이트되었습니다.' 
    });

  } catch (error) {
    console.error('\n[ERROR] Update failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });

    if (connection) {
      await connection.rollback();
      console.log('Transaction rolled back');
    }

    return NextResponse.json(
      { success: false, message: '풀 설정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
      console.log('\nDB Connection released');
    }
    console.log('[PUT /api/mmt/pool-config] End\n');
  }
}