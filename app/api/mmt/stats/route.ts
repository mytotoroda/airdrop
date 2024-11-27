// app/api/mmt/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const tokenPair = searchParams.get('tokenPair');

    if (!tokenPair) {
      return NextResponse.json(
        { success: false, message: 'Token pair parameter is required' },
        { status: 400 }
      );
    }

    const [tokenA, tokenB] = tokenPair.split('/');

    connection = await pool.getConnection();

    // 수정된 쿼리: 모호한 컬럼 참조 수정
    const [marketStats] = await connection.query(`
      WITH pool_data AS (
        SELECT 
          p.id,
          p.pool_address,
          p.token_a_address,
          p.token_a_symbol,
          p.token_a_decimals,
          p.token_a_reserve,
          p.token_b_address,
          p.token_b_symbol,
          p.token_b_decimals,
          p.token_b_reserve,
          p.fee_rate,
          p.status,
          p.last_price,
          p.liquidity,
          p.liquidity_usd,
          pc.base_spread,
          pc.bid_adjustment,
          pc.ask_adjustment,
          pos.token_a_amount,
          pos.token_b_amount,
          pos.total_value_usd,
          pos.token_ratio,
          pos.fees_earned_usd,
          pos.fee_apy,
          pos.volume_24h as pos_volume_24h
        FROM mmt_pools p
        LEFT JOIN mmt_pool_configs pc ON p.id = pc.pool_id
        LEFT JOIN mmt_pos_current pos ON p.id = pos.pool_id
        WHERE p.token_a_symbol = ? 
        AND p.token_b_symbol = ?
        AND p.status = 'ACTIVE'
      ),
      hourly_stats AS (
        SELECT
          MAX(ps.price) as price_high_24h,
          MIN(ps.price) as price_low_24h,
          MAX(ps.volume_24h) as max_volume_24h
        FROM mmt_pool_stats ps
        JOIN pool_data pd ON ps.pool_id = pd.id
        WHERE ps.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ),
      transaction_stats AS (
        SELECT
          COUNT(*) as total_trades_24h,
          COUNT(CASE WHEN t.status = 'SUCCESS' THEN 1 END) as successful_trades_24h,
          COALESCE(AVG(CASE WHEN t.status = 'SUCCESS' THEN t.price_impact END), 0) as avg_price_impact_24h,
          COALESCE(SUM(CASE WHEN t.status = 'SUCCESS' THEN t.fee_amount END), 0) as total_fees_24h
        FROM mmt_transactions t
        JOIN pool_data pd ON t.pool_id = pd.id
        WHERE t.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      )
      SELECT 
        pd.*,
        hs.price_high_24h,
        hs.price_low_24h,
        hs.max_volume_24h,
        ts.total_trades_24h,
        ts.successful_trades_24h,
        ts.avg_price_impact_24h,
        ts.total_fees_24h,
        (
          SELECT COUNT(*)
          FROM mmt_pos_rebalance_history rh
          WHERE rh.pool_id = pd.id
          AND rh.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ) as rebalance_count_24h
      FROM pool_data pd
      CROSS JOIN hourly_stats hs
      CROSS JOIN transaction_stats ts
    `, [tokenA, tokenB]);

    if (!marketStats || marketStats.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Pool stats not found' },
        { status: 404 }
      );
    }

    // 수정된 성과 통계 쿼리
    const [performanceStats] = await connection.query(`
      WITH daily_snapshots AS (
        SELECT 
          DATE(s.timestamp) as date,
          FIRST_VALUE(s.total_value_usd) OVER (PARTITION BY DATE(s.timestamp) ORDER BY s.timestamp) as day_start_value,
          LAST_VALUE(s.total_value_usd) OVER (PARTITION BY DATE(s.timestamp) ORDER BY s.timestamp) as day_end_value,
          FIRST_VALUE(s.price) OVER (PARTITION BY DATE(s.timestamp) ORDER BY s.timestamp) as day_start_price,
          LAST_VALUE(s.price) OVER (PARTITION BY DATE(s.timestamp) ORDER BY s.timestamp) as day_end_price
        FROM mmt_pos_snapshots s
        WHERE s.pool_id = ?
        AND s.timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      )
      SELECT
        SUM(CASE WHEN day_end_value > day_start_value THEN 1 ELSE 0 END) as profitable_days,
        AVG((day_end_value - day_start_value) / NULLIF(day_start_value, 0) * 100) as avg_daily_return,
        AVG(ABS(day_end_price - day_start_price) / NULLIF(day_start_price, 0) * 100) as avg_daily_volatility
      FROM daily_snapshots
    `, [marketStats.id]);

    // 응답 데이터 구성
    return NextResponse.json({
      success: true,
      data: {
        current: {
          price: marketStats.last_price,
          high24h: marketStats.price_high_24h,
          low24h: marketStats.price_low_24h,
          volume24h: marketStats.pos_volume_24h,
          liquidity: marketStats.liquidity,
          liquidityUsd: marketStats.liquidity_usd,
          feeRate: marketStats.fee_rate,
        },
        position: {
          totalValueUsd: marketStats.total_value_usd,
          tokenRatio: marketStats.token_ratio,
          feesEarned: marketStats.fees_earned_usd,
          feeApy: marketStats.fee_apy,
          tokenAAmount: marketStats.token_a_amount,
          tokenBAmount: marketStats.token_b_amount,
        },
        trading: {
          totalTrades: marketStats.total_trades_24h,
          successfulTrades: marketStats.successful_trades_24h,
          averagePriceImpact: marketStats.avg_price_impact_24h,
          totalFees: marketStats.total_fees_24h,
          rebalanceCount: marketStats.rebalance_count_24h,
        },
        performance: performanceStats ? {
          profitableDays: performanceStats.profitable_days || 0,
          avgDailyReturn: performanceStats.avg_daily_return || 0,
          avgDailyVolatility: performanceStats.avg_daily_volatility || 0,
        } : {
          profitableDays: 0,
          avgDailyReturn: 0,
          avgDailyVolatility: 0,
        },
        spread: {
          base: marketStats.base_spread,
          bidAdjustment: marketStats.bid_adjustment,
          askAdjustment: marketStats.ask_adjustment,
          effectiveBid: marketStats.last_price * (1 - marketStats.base_spread + marketStats.bid_adjustment),
          effectiveAsk: marketStats.last_price * (1 + marketStats.base_spread + marketStats.ask_adjustment),
        }
      }
    });

  } catch (error) {
    console.error('Error fetching market stats:', error);
    return NextResponse.json(
      { success: false, message: '시장 통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}