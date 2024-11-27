// app/api/mmt/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: 설정 조회
export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    
    const [globalSettings] = await connection.query(
      'SELECT * FROM mmt_global_settings WHERE id = 1'
    );

    const [notificationSettings] = await connection.query(
      'SELECT * FROM mmt_notification_settings WHERE id = 1'
    );

    return NextResponse.json({
      success: true,
      globalSettings: globalSettings[0] || {
        maxGasPrice: 0.000005,
        defaultSlippage: 1.0,
        emergencyStopLoss: 5.0,
        autoRebalancing: true
      },
      notificationSettings: notificationSettings[0] || {
        email: '',
        telegram: '',
        discord: '',
        emailEnabled: false,
        telegramEnabled: false,
        discordEnabled: false,
        notificationLevel: 'CRITICAL'
      }
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '설정을 불러오는데 실패했습니다.' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// POST: 설정 저장
export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { globalSettings, notificationSettings } = await request.json();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 전역 설정 업데이트 또는 생성
    await connection.query(
      `INSERT INTO mmt_global_settings 
       (id, max_gas_price, default_slippage, emergency_stop_loss, rpc_endpoint, 
        auto_rebalancing, webhook_url, creator_wallet, network) 
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       max_gas_price = VALUES(max_gas_price),
       default_slippage = VALUES(default_slippage),
       emergency_stop_loss = VALUES(emergency_stop_loss),
       rpc_endpoint = VALUES(rpc_endpoint),
       auto_rebalancing = VALUES(auto_rebalancing),
       webhook_url = VALUES(webhook_url),
       network = VALUES(network)`,
      [
        globalSettings.maxGasPrice,
        globalSettings.defaultSlippage,
        globalSettings.emergencyStopLoss,
        globalSettings.rpcEndpoint,
        globalSettings.autoRebalancing,
        globalSettings.webhookUrl,
        globalSettings.creatorWallet,
        process.env.NEXT_PUBLIC_NETWORK || 'mainnet-beta'
      ]
    );

    // 알림 설정 업데이트 또는 생성
    await connection.query(
      `INSERT INTO mmt_notification_settings 
       (id, creator_wallet, email, telegram, discord, 
        email_enabled, telegram_enabled, discord_enabled, notification_level) 
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       email = VALUES(email),
       telegram = VALUES(telegram),
       discord = VALUES(discord),
       email_enabled = VALUES(email_enabled),
       telegram_enabled = VALUES(telegram_enabled),
       discord_enabled = VALUES(discord_enabled),
       notification_level = VALUES(notification_level)`,
      [
        notificationSettings.creatorWallet,
        notificationSettings.email,
        notificationSettings.telegram,
        notificationSettings.discord,
        notificationSettings.emailEnabled,
        notificationSettings.telegramEnabled,
        notificationSettings.discordEnabled,
        notificationSettings.notificationLevel || 'CRITICAL'
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: '설정이 성공적으로 저장되었습니다.'
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '설정 저장에 실패했습니다.' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}