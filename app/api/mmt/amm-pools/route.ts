// app/api/mmt/amm-pools/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { Raydium } from '@raydium-io/raydium-sdk-v2';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchTokenMetadata(connection: any, address: string) {
  try {
    const response = await fetch(`https://cdn.helius-rpc.com/token-metadata/${address}`);
    const metadata = await response.json();
    return {
      name: metadata.name,
      symbol: metadata.symbol,
      logoURI: metadata.image,
      decimals: metadata.decimals
    };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();

    // AMM 풀 기본 정보 조회
    const [pools] = await connection.query(`
      SELECT 
        p.*,
        COALESCE(s.volume_24h, 0) as volume_24h,
        COALESCE(s.price, p.last_price) as current_price,
        COALESCE(s.token_a_reserve, 0) as token_a_reserve,
        COALESCE(s.token_b_reserve, 0) as token_b_reserve,
        COALESCE(tm_a.name, '') as token_a_name,
        COALESCE(tm_a.logo_uri, '') as token_a_logo,
        COALESCE(tm_b.name, '') as token_b_name,
        COALESCE(tm_b.logo_uri, '') as token_b_logo,
        pc.enabled
      FROM mmt_pools p
      LEFT JOIN mmt_pool_stats s ON p.id = s.pool_id 
        AND s.timestamp = (
          SELECT MAX(timestamp) 
          FROM mmt_pool_stats 
          WHERE pool_id = p.id
        )
      LEFT JOIN token_metadata tm_a ON p.token_a_address = tm_a.address
      LEFT JOIN token_metadata tm_b ON p.token_b_address = tm_b.address
      LEFT JOIN mmt_pool_configs pc ON p.id = pc.pool_id
      WHERE p.pool_type = 'AMM'
      ORDER BY p.liquidity_usd DESC
    `);

    // 24시간 전 가격 조회를 위한 서브쿼리
    const priceChanges = await Promise.all(pools.map(async (pool: any) => {
      const [priceHistory] = await connection.query(`
        SELECT price
        FROM mmt_pool_stats
        WHERE pool_id = ?
        AND timestamp <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ORDER BY timestamp DESC
        LIMIT 1
      `, [pool.id]);

      const oldPrice = priceHistory[0]?.price || pool.last_price;
      const priceChangePercent = oldPrice ? 
        ((pool.current_price - oldPrice) / oldPrice) * 100 : 
        0;

      return {
        id: pool.id,
        priceChange: priceChangePercent
      };
    }));

    // 결과 포맷팅
    const formattedPools = pools.map((pool: any) => {
      const priceChange = priceChanges.find(pc => pc.id === pool.id)?.priceChange || 0;
      
      return {
        id: pool.id.toString(),
        poolAddress: pool.pool_address,
        tokenA: {
          address: pool.token_a_address,
          symbol: pool.token_a_symbol,
          name: pool.token_a_name || pool.token_a_symbol,
          decimals: pool.token_a_decimals,
          logoURI: pool.token_a_logo || null
        },
        tokenB: {
          address: pool.token_b_address,
          symbol: pool.token_b_symbol,
          name: pool.token_b_name || pool.token_b_symbol,
          decimals: pool.token_b_decimals,
          logoURI: pool.token_b_logo || null
        },
        lastPrice: parseFloat(pool.current_price),
        priceChangePercent24h: parseFloat(priceChange.toFixed(2)),
        liquidityUsd: parseFloat(pool.liquidity_usd),
        volume24h: parseFloat(pool.volume_24h),
        fee: parseFloat(pool.fee_rate),
        status: pool.enabled ? 
          (pool.rebalance_needed ? 'PAUSED' : 'ACTIVE') : 
          'INACTIVE',
        tokenAReserve: parseFloat(pool.token_a_reserve),
        tokenBReserve: parseFloat(pool.token_b_reserve)
      };
    });

    return NextResponse.json(formattedPools);

  } catch (error) {
    console.error('Error fetching AMM pools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AMM pools' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// POST 엔드포인트 - 새로운 풀 추가
export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const data = await request.json();
    const { 
      poolAddress,
      tokenAAddress,
      tokenASymbol,
      tokenADecimals,
      tokenBAddress,
      tokenBSymbol,
      tokenBDecimals,
      feeRate,
      creatorWallet
    } = data;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 풀 추가
    const [result] = await connection.query(
      `INSERT INTO mmt_pools (
        pool_address,
        token_a_address,
        token_a_symbol,
        token_a_decimals,
        token_b_address,
        token_b_symbol,
        token_b_decimals,
        fee_rate,
        creator_wallet,
        pool_type,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'AMM', 'ACTIVE')`,
      [
        poolAddress,
        tokenAAddress,
        tokenASymbol,
        tokenADecimals,
        tokenBAddress,
        tokenBSymbol,
        tokenBDecimals,
        feeRate,
        creatorWallet
      ]
    );

    // 기본 설정 추가
    await connection.query(
      `INSERT INTO mmt_pool_configs (
        pool_id,
        base_spread,
        check_interval,
        min_token_a_trade,
        max_token_a_trade,
        trade_size_percentage,
        target_ratio,
        rebalance_threshold,
        max_slippage
      ) VALUES (?, 0.002, 30, 0, 0, 0.05, 0.5, 0.05, 0.01)`,
      [result.insertId]
    );

    // 이벤트 기록
    await connection.query(
      `INSERT INTO mmt_pool_events (
        pool_id,
        event_type,
        description
      ) VALUES (?, 'CREATED', 'AMM pool created')`,
      [result.insertId]
    );

    await connection.commit();

    return NextResponse.json({ 
      success: true,
      poolId: result.insertId,
      message: 'Pool created successfully' 
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating AMM pool:', error);
    return NextResponse.json(
      { error: 'Failed to create AMM pool' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}