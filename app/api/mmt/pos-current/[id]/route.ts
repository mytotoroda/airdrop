// app/api/mmt/pos-current/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const pool = getPool();
  let connection;

  try {
    connection = await pool.getConnection();

    // 현재 포지션 데이터 조회
    const [positionResult] = await connection.query(`
      SELECT 
        pc.*,
        p.token_a_symbol,
        p.token_b_symbol,
        p.last_price,
        p.volume_24h,
        COALESCE(p.token_a_reserve, 0) as pool_token_a_reserve,
        COALESCE(p.token_b_reserve, 0) as pool_token_b_reserve
      FROM mmt_pos_current pc
      JOIN mmt_pools p ON p.id = pc.pool_id
      WHERE pc.pool_id = ?
    `, [id]);

    if (!positionResult) {
      // 데이터가 없는 경우 기본값 반환
      const [poolData] = await connection.query(`
        SELECT 
          token_a_symbol,
          token_b_symbol,
          last_price,
          token_a_reserve,
          token_b_reserve,
          volume_24h,
          liquidity_usd
        FROM mmt_pools
        WHERE id = ?
      `, [id]);

      if (!poolData) {
        return NextResponse.json(
          { error: 'Pool not found' },
          { status: 404 }
        );
      }

      // 기본 포지션 데이터 생성
      const defaultPosition = {
        tokenAAmount: 0,
        tokenBAmount: 0,
        tokenAValueUsd: 0,
        tokenBValueUsd: 0,
        totalValueUsd: 0,
        initialInvestmentUsd: 0,
        currentRoi: 0,
        tokenRatio: 0.5,
        impermanentLossUsd: 0,
        feesEarnedUsd: 0,
        volume24h: poolData.volume_24h || 0,
        feeApy: 0,
        utilizationRate: 0
      };

      return NextResponse.json({ position: defaultPosition });
    }

    // 포지션 데이터 가공
    const position = {
      tokenAAmount: Number(positionResult.token_a_amount) || 0,
      tokenBAmount: Number(positionResult.token_b_amount) || 0,
      tokenAValueUsd: Number(positionResult.token_a_value_usd) || 0,
      tokenBValueUsd: Number(positionResult.token_b_value_usd) || 0,
      totalValueUsd: Number(positionResult.total_value_usd) || 0,
      initialInvestmentUsd: Number(positionResult.initial_investment_usd) || 0,
      currentRoi: Number(positionResult.current_roi) || 0,
      tokenRatio: Number(positionResult.token_ratio) || 0.5,
      impermanentLossUsd: Number(positionResult.impermanent_loss_usd) || 0,
      feesEarnedUsd: Number(positionResult.fees_earned_usd) || 0,
      volume24h: Number(positionResult.volume_24h) || 0,
      feeApy: Number(positionResult.fee_apy) || 0,
      utilizationRate: Number(positionResult.utilization_rate) || 0
    };

    // 추가 컨텍스트 데이터
    const poolContext = {
      tokenASymbol: positionResult.token_a_symbol,
      tokenBSymbol: positionResult.token_b_symbol,
      lastPrice: Number(positionResult.last_price),
      tokenAReserve: Number(positionResult.pool_token_a_reserve),
      tokenBReserve: Number(positionResult.pool_token_b_reserve)
    };

    return NextResponse.json({ 
      position,
      poolContext
    });

  } catch (error) {
    console.error('Error fetching position data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch position data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}