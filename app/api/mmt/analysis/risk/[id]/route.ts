// app/api/mmt/analysis/risk/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { PoolConnection } from 'mysql2/promise';

export const dynamic = 'force-dynamic';

interface QueryError extends Error {
  code?: string;
  sqlMessage?: string;
  sql?: string;
}

async function executeQuery(
  connection: PoolConnection, 
  sql: string, 
  params: any[],
  queryName: string
) {
  try {
    // 실제 바인딩된 쿼리문 생성 (디버깅용)
    const debugSql = sql.replace(/\?/g, (match, i) => {
      const param = params[i];
      if (typeof param === 'string') return `'${param}'`;
      if (param === null) return 'NULL';
      return param;
    });

    // 쿼리 실행 전 로깅
    //console.log(`[${queryName}] Executing Query:`, {
     // rawSql: sql,
     // debugSql,
     // params,
     // timestamp: new Date().toISOString()
    //});

    const [result] = await connection.query(sql, params);
    
    // 쿼리 실행 결과 로깅
    //console.log(`[${queryName}] Success:`, {
     // params,
     // resultCount: Array.isArray(result) ? result.length : 1,
     // sampleData: Array.isArray(result) && result.length > 0 ? result[0] : result,
     // executedQuery: debugSql
    //});

    return result;
  } catch (error) {
    const queryError = error as QueryError;
    console.error(`[${queryName}] Error:`, {
      code: queryError.code,
      message: queryError.message,
      sqlMessage: queryError.sqlMessage,
      sql: queryError.sql,
      params,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  //console.log('[Risk Analysis] Started for poolId:', params.id);
  
  const pool = getPool();
  let connection = null;

  try {
    // poolId 변환 및 로깅
    const poolId = parseInt(params.id, 10);

    /*
    console.log('[Pool ID Conversion]', {
      original: params.id,
      converted: poolId,
      isValid: !isNaN(poolId)
    });
    */

    if (isNaN(poolId)) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 풀 ID입니다.' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // 24시간/7일 변동성 및 슬리피지 데이터 조회
    const volatilityData = await executeQuery(
      connection,
      `SELECT 
        STDDEV(price_impact) * 100 as volatility_24h,
        AVG(price_impact) * 100 as avg_slippage,
        MAX(ABS(price_impact)) * 100 as max_slippage
      FROM mmt_transactions 
      WHERE pool_id = ? 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [poolId],
      'Volatility Query'
    );

    // 7일 변동성
    const weeklyVolatility = await executeQuery(
      connection,
      `SELECT STDDEV(price_impact) * 100 as volatility_7d
       FROM mmt_transactions 
       WHERE pool_id = ? 
       AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [poolId],
      'Weekly Volatility Query'
    );

    // 최대 손실률(Drawdown) 계산
    const drawdownData = await executeQuery(
      connection,
      `SELECT 
        ((MAX(total_value_usd) - MIN(total_value_usd)) / MAX(total_value_usd)) * 100 as max_drawdown,
        DATE_FORMAT(MIN(timestamp), '%Y-%m-%d') as max_drawdown_date
       FROM mmt_pos_snapshots
       WHERE pool_id = ?
       AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [poolId],
      'Drawdown Query'
    );

    // 리밸런싱 통계
    const rebalanceStats = await executeQuery(
      connection,
      `SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed_count
       FROM mmt_pos_rebalance_history
       WHERE pool_id = ?`,
      [poolId],
      'Rebalance Stats Query'
    );

    // 비상 정지 데이터
    const emergencyData = await executeQuery(
      connection,
      `SELECT 
        COUNT(*) as stop_count,
        MAX(created_at) as last_stop
       FROM mmt_pool_events
       WHERE pool_id = ? 
       AND event_type = 'ERROR' 
       AND severity = 'ERROR'`,
      [poolId],
      'Emergency Stops Query'
    );

    // 가격 변동 추이
    const priceDeviations = await executeQuery(
      connection,
      `SELECT 
        timestamp,
        ABS((token_a_value_usd / token_b_value_usd) - 1) * 100 as deviation,
        volume_24h as volume
       FROM mmt_pos_snapshots
       WHERE pool_id = ?
       AND timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY timestamp ASC`,
      [poolId],
      'Price Deviations Query'
    );

    // 최근 리스크 이벤트
    const recentEvents = await executeQuery(
      connection,
      `SELECT 
        created_at as timestamp,
        event_type as type,
        description,
        severity
       FROM mmt_pool_events
       WHERE pool_id = ?
       AND severity IN ('WARNING', 'ERROR')
       ORDER BY created_at DESC
       LIMIT 10`,
      [poolId],
      'Recent Events Query'
    );

    const riskData = {
      volatility24h: volatilityData[0]?.volatility_24h || 0,
      volatility7d: weeklyVolatility[0]?.volatility_7d || 0,
      maxDrawdown: drawdownData[0]?.max_drawdown || 0,
      maxDrawdownDate: drawdownData[0]?.max_drawdown_date,
      averageSlippage: volatilityData[0]?.avg_slippage || 0,
      maxSlippage: volatilityData[0]?.max_slippage || 0,
      rebalanceCount: rebalanceStats[0]?.total_count || 0,
      failedRebalanceCount: rebalanceStats[0]?.failed_count || 0,
      emergencyStops: emergencyData[0]?.stop_count || 0,
      lastEmergencyStop: emergencyData[0]?.last_stop,
      priceDeviations: priceDeviations.map((pd: any) => ({
        timestamp: new Date(pd.timestamp).toLocaleString(),
        deviation: Number(pd.deviation),
        volume: Number(pd.volume)
      })),
      recentEvents: recentEvents.map((event: any) => ({
        timestamp: new Date(event.timestamp).toLocaleString(),
        type: event.type,
        description: event.description,
        severity: event.severity === 'ERROR' ? 'HIGH' : 
                 event.severity === 'WARNING' ? 'MEDIUM' : 'LOW'
      }))
    };


/*
    console.log('[Risk Analysis Result]', {
      poolId,
      metrics: {
        volatility24h: riskData.volatility24h,
        volatility7d: riskData.volatility7d,
        maxDrawdown: riskData.maxDrawdown,
        averageSlippage: riskData.averageSlippage
      },
      eventCounts: {
        rebalanceTotal: riskData.rebalanceCount,
        rebalanceFailed: riskData.failedRebalanceCount,
        emergencyStops: riskData.emergencyStops
      }
    });
    */

    return NextResponse.json({
      success: true,
      data: riskData
    });

  } catch (error) {
    const err = error as QueryError;
    console.error('[Fatal Error]', {
      name: err.name,
      message: err.message,
      code: err.code,
      sqlMessage: err.sqlMessage,
      stack: err.stack,
      poolId: params.id
    });

    return NextResponse.json(
      { 
        success: false, 
        message: '리스크 분석 데이터를 불러오는데 실패했습니다.',
        error: {
          code: err.code,
          message: process.env.NODE_ENV === 'development' ? err.message : '서버 오류가 발생했습니다.'
        }
      },
      { status: 500 }
    );

  } finally {
    if (connection) {
      try {
        connection.release();
        //console.log('[DB Connection] Successfully released');
      } catch (releaseError) {
        console.error('[DB Connection] Error releasing connection:', releaseError);
      }
    }
  }
}