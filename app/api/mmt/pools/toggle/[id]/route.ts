// app/api/mmt/pools/toggle/[id]/route.ts
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
    const { enabled = false, network } = await request.json();

    console.log(`Processing MM toggle request for pool ${poolId}: ${enabled ? 'enable' : 'disable'}`);

    const rpcUrl = network === 'mainnet-beta' 
      ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL 
      : process.env.NEXT_PUBLIC_DEVNET_RPC_URL;
    
    const solanaConnection = new Connection(rpcUrl!, 'confirmed');
    const marketMaker = new MarketMaker(solanaConnection, network === 'mainnet-beta');

    // MarketMaker 작업 실행
    const success = enabled 
      ? await marketMaker.enable(poolId)
      : await marketMaker.disable(poolId);

    if (!success) {
      throw new Error(`Failed to ${enabled ? 'enable' : 'disable'} market maker`);
    }

    return NextResponse.json({
      success: true,
      message: `Market making ${enabled ? 'enabled' : 'disabled'} successfully`
    });

  } catch (error) {
    console.error('Error toggling market making:', error);
    
    // 상세한 에러 정보 반환
    return NextResponse.json(
      { 
        success: false,
        message: `Failed to ${enabled ? 'enable' : 'disable'} market making`,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error
      },
      { status: 500 }
    );

  } finally {
    if (connection) {
      connection.release();
    }
  }
}