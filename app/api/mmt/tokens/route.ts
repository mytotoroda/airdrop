// app/api/mmt/tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const pool = getPool();
  try {
    // 쿼리 결과의 첫 번째 배열만 사용
    const [tokens] = await pool.query(`
      SELECT 
        address,
        symbol,
        name,
        decimals,
        logo_uri,
        updated_at
      FROM token_metadata
      ORDER BY symbol ASC
    `);
    
    //console.log('Raw tokens data:', tokens);

    // 데이터가 없는 경우 체크
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No tokens found in database',
        data: []
      });
    }

    // 데이터 매핑
    const validTokens = tokens.map(token => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: Number(token.decimals),
      logoURI: token.logo_uri
    }));

   // console.log('Processed tokens:', validTokens);

    return NextResponse.json({
      success: true,
      data: validTokens
    });

  } catch (error) {
    console.error('Error in /api/mmt/tokens:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to fetch tokens'
      },
      { status: 500 }
    );
  }
}