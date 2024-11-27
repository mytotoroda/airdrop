// app/api/mmt/positions/performance/[poolId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { poolId: string } }
) {
  const dbPool = getPool();
  let connection = null;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '1W';
    
    connection = await dbPool.getConnection();

    // 기간에 따른 SQL WHERE 조건 생성
    let timeCondition = '';
    switch (range) {
      case '1D':
        timeCondition = 'AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
        break;
      case '1W':
        timeCondition = 'AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
        break;
      case '1M':
        timeCondition = 'AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        break;
      case '3M':
        timeCondition = 'AND timestamp >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
        break;
      default:
        timeCondition = ''; // ALL
    }

    // 성과 데이터 조회 (기존 테이블 구조에 맞게 수정)
    const [performanceData] = await connection.query(
      `SELECT 
        timestamp,
        liquidity_usd as value_usd,
        token_a_reserve as token_a_amount,
        token_b_reserve as token_b_amount,
        price as token_a_price,
        1 as token_b_price,
        COALESCE(
          ((liquidity_usd - LAG(liquidity_usd) OVER (ORDER BY timestamp)) / 
          LAG(liquidity_usd) OVER (ORDER BY timestamp) * 100),
          0
        ) as roi,
        EXISTS(
          SELECT 1 
          FROM mmt_transactions t 
          WHERE t.pool_id = mmt_pool_stats.pool_id
          AND t.action_type = 'REBALANCE'
          AND DATE(t.created_at) = DATE(mmt_pool_stats.timestamp)
        ) as rebalanced
       FROM mmt_pool_stats
       WHERE pool_id = ? ${timeCondition}
       ORDER BY timestamp`,
      [params.poolId]
    );

    // 주요 지표 계산
    const [[metrics]] = await connection.query(
      `SELECT 
        MAX(liquidity_usd) as current_value,
        (
          (MAX(liquidity_usd) - MIN(liquidity_usd)) / 
          NULLIF(MIN(liquidity_usd), 0) * 100
        ) as total_roi,
        (
          SELECT COUNT(*) 
          FROM mmt_transactions t
          WHERE t.pool_id = ? 
          AND t.action_type = 'REBALANCE'
          ${timeCondition.replace('timestamp', 'created_at')}
        ) as rebalance_count,
        (
          SELECT COALESCE(SUM(total_cost_usd), 0)
          FROM mmt_transactions t
          WHERE t.pool_id = ?
          AND t.action_type = 'REBALANCE'
          ${timeCondition.replace('timestamp', 'created_at')}
        ) as rebalance_cost,
        (
          SELECT DATE(timestamp)
          FROM mmt_pool_stats
          WHERE pool_id = ?
          ${timeCondition}
          ORDER BY (
            liquidity_usd - LAG(liquidity_usd) OVER (ORDER BY timestamp)
          ) / NULLIF(LAG(liquidity_usd) OVER (ORDER BY timestamp), 0) DESC
          LIMIT 1
        ) as best_day,
        (
          SELECT (
            liquidity_usd - LAG(liquidity_usd) OVER (ORDER BY timestamp)
          ) / NULLIF(LAG(liquidity_usd) OVER (ORDER BY timestamp), 0) * 100
          FROM mmt_pool_stats
          WHERE pool_id = ?
          ${timeCondition}
          ORDER BY (
            liquidity_usd - LAG(liquidity_usd) OVER (ORDER BY timestamp)
          ) / NULLIF(LAG(liquidity_usd) OVER (ORDER BY timestamp), 0) DESC
          LIMIT 1
        ) as best_day_roi,
        (
          SELECT DATE(timestamp)
          FROM mmt_pool_stats
          WHERE pool_id = ?
          ${timeCondition}
          ORDER BY (
            liquidity_usd - LAG(liquidity_usd) OVER (ORDER BY timestamp)
          ) / NULLIF(LAG(liquidity_usd) OVER (ORDER BY timestamp), 0)
          LIMIT 1
        ) as worst_day,
        (
          SELECT (
            liquidity_usd - LAG(liquidity_usd) OVER (ORDER BY timestamp)
          ) / NULLIF(LAG(liquidity_usd) OVER (ORDER BY timestamp), 0) * 100
          FROM mmt_pool_stats
          WHERE pool_id = ?
          ${timeCondition}
          ORDER BY (
            liquidity_usd - LAG(liquidity_usd) OVER (ORDER BY timestamp)
          ) / NULLIF(LAG(liquidity_usd) OVER (ORDER BY timestamp), 0)
          LIMIT 1
        ) as worst_day_roi
       FROM mmt_pool_stats
       WHERE pool_id = ? ${timeCondition}`,
      [
        params.poolId, params.poolId, params.poolId, 
        params.poolId, params.poolId, params.poolId,
        params.poolId, params.poolId
      ]
    );

    // 응답 데이터 구성
    const formattedMetrics = {
      totalValue: metrics.current_value || 0,
      totalROI: metrics.total_roi || 0,
      rebalanceCount: metrics.rebalance_count || 0,
      rebalanceCost: metrics.rebalance_cost || 0,
      bestDay: {
        date: metrics.best_day,
        roi: metrics.best_day_roi || 0
      },
      worstDay: {
        date: metrics.worst_day,
        roi: metrics.worst_day_roi || 0
      }
    };

    return NextResponse.json({
      success: true,
      performance: performanceData,
      metrics: formattedMetrics
    });

  } catch (error) {
    console.error('Performance data error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '성과 데이터 조회 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}