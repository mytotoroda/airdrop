// app/api/mmt/pool-chart/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 로깅 유틸리티
const logStep = (step: string, data?: any) => {
  console.log('\n--------------------');
  console.log(`[Pool Chart API] ${step}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('--------------------\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  let connection = null;
  
  try {
    const poolId = params.id;
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';

    //logStep('Request received', { poolId, timeRange });

    if (!poolId) {
      return NextResponse.json(
        { success: false, message: 'Pool ID is required' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    // 시간 범위에 따른 조회 기간 설정
    let timeFilter: string;
    switch (timeRange) {
      case '1h':
        timeFilter = 'INTERVAL 1 HOUR';
        break;
      case '24h':
        timeFilter = 'INTERVAL 24 HOUR';
        break;
      case '7d':
        timeFilter = 'INTERVAL 7 DAY';
        break;
      case '30d':
        timeFilter = 'INTERVAL 30 DAY';
        break;
      default:
        timeFilter = 'INTERVAL 24 HOUR';
    }

    const query = `
      SELECT 
        timestamp,
        price,
        volume_24h,
        liquidity_usd,
        token_a_reserve,
        token_b_reserve
      FROM mmt_pool_stats
      WHERE pool_id = ?
      AND timestamp >= DATE_SUB(NOW(), ${timeFilter})
      ORDER BY timestamp ASC
    `;

    //logStep('Executing query', { query, poolId, timeFilter });

    const [chartData] = await connection.query(query, [poolId]);
    //logStep('Query result', { count: chartData.length });

    if (!chartData || chartData.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          metrics: {
            priceHistory: []
          }
        },
        message: 'No data available for the specified time range'
      });
    }

    const formattedData = chartData.map((record: any) => ({
      timestamp: record.timestamp,
      price: parseFloat(record.price),
      volume: parseFloat(record.volume_24h),
      liquidity: parseFloat(record.liquidity_usd),
      tokenAReserve: parseFloat(record.token_a_reserve),
      tokenBReserve: parseFloat(record.token_b_reserve)
    }));

    //logStep('Formatted data', {
      //dataPoints: formattedData.length,
      //firstPoint: formattedData[0],
      //lastPoint: formattedData[formattedData.length - 1]
    //});

    return NextResponse.json({
      success: true,
      data: {
        poolId,
        timeRange,
        metrics: {
          priceHistory: formattedData
        }
      }
    });

  } catch (error) {
    //logStep('Error occurred', { error });
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch chart data' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
      //logStep('Database connection released');
    }
  }
}