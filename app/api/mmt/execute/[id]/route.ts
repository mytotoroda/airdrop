// app/api/mmt/execute/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { Connection } from '@solana/web3.js';
import { MarketMaker } from '@/lib/mmt/marketMaker';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getPool();
  let connection = null;

  try {
    const poolId = params.id;
    const { network = 'mainnet-beta' } = await request.json();

    const rpcUrl = network === 'mainnet-beta' 
      ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL 
      : process.env.NEXT_PUBLIC_DEVNET_RPC_URL;
    
    const solanaConnection = new Connection(rpcUrl!, 'confirmed');
    const marketMaker = new MarketMaker(solanaConnection, network === 'mainnet-beta');

    connection = await pool.getConnection();

    try {
      // 1. MM 활성화 상태 확인
      const [[config]] = await connection.query(
        'SELECT * FROM mmt_pool_configs WHERE pool_id = ? AND enabled = true',
        [poolId]
      );

      if (!config) {
        return NextResponse.json({
          success: false,
          message: 'MM is not enabled for this pool'
        });
      }

      // 2. MM 실행
      const result = await marketMaker.executeOnce(poolId);

      return NextResponse.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error executing MM:', error);
      throw error;
    }

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );

  } finally {
    if (connection) {
      connection.release();
    }
  }
}