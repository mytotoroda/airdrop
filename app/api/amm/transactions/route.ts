import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 트랜잭션 타입 정의
type TransactionType = 'SWAP' | 'ADD_LIQUIDITY' | 'REMOVE_LIQUIDITY';

// RPC URL 설정
const getRpcUrl = () => {
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta'
    ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL
    : clusterApiUrl('devnet');
};

export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { 
      poolId, 
      transactionType,
      walletAddress,
      tokenAAmount,
      tokenBAmount 
    } = await request.json();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. 풀 정보 조회
      const [pools] = await connection.query(
        'SELECT * FROM mmt_pools WHERE id = ?',
        [poolId]
      );

      if (!pools.length) {
        throw new Error('Pool not found');
      }

      const poolInfo = pools[0];

      // 2. 트랜잭션 레코드 생성
      const [result] = await connection.query(
        `INSERT INTO amm_transactions (
          pool_id,
          transaction_type,
          wallet_address,
          token_a_amount,
          token_b_amount,
          status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          poolId,
          transactionType,
          walletAddress,
          tokenAAmount,
          tokenBAmount,
          'PENDING'
        ]
      );

      const transactionId = result.insertId;

      // 3. 트랜잭션 처리 결과에 따라 풀 상태 업데이트
      switch (transactionType) {
        case 'SWAP':
          await handleSwap(connection, poolInfo, tokenAAmount, tokenBAmount);
          break;
        case 'ADD_LIQUIDITY':
          await handleAddLiquidity(connection, poolInfo, tokenAAmount, tokenBAmount);
          break;
        case 'REMOVE_LIQUIDITY':
          await handleRemoveLiquidity(connection, poolInfo, tokenAAmount, tokenBAmount);
          break;
      }

      // 4. 트랜잭션 상태 업데이트
      await connection.query(
        'UPDATE amm_transactions SET status = ? WHERE id = ?',
        ['COMPLETED', transactionId]
      );

      await connection.commit();

      return NextResponse.json({ 
        success: true, 
        message: '트랜잭션이 성공적으로 처리되었습니다.',
        transactionId
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error: any) {
    console.error('Error processing transaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || '트랜잭션 처리 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// 스왑 처리 함수
async function handleSwap(
  connection: any,
  poolInfo: any,
  tokenAAmount: number,
  tokenBAmount: number
) {
  // 1. 리저브 검증
  const inputReserve = poolInfo.token_a_reserve;
  const outputReserve = poolInfo.token_b_reserve;

  if (tokenAAmount > inputReserve) {
    throw new Error('Insufficient liquidity');
  }

  // 2. 수수료 계산
  const fee = tokenAAmount * (poolInfo.fee_rate / 100);
  const amountWithFee = tokenAAmount - fee;

  // 3. 아웃풋 금액 계산 (x * y = k)
  const outputAmount = (outputReserve * amountWithFee) / (inputReserve + amountWithFee);

  // 4. 풀 리저브 업데이트
  await connection.query(
    `UPDATE mmt_pools 
     SET token_a_reserve = token_a_reserve + ?,
         token_b_reserve = token_b_reserve - ?
     WHERE id = ?`,
    [tokenAAmount, outputAmount, poolInfo.id]
  );
}

// 유동성 추가 처리 함수
async function handleAddLiquidity(
  connection: any,
  poolInfo: any,
  tokenAAmount: number,
  tokenBAmount: number
) {
  await connection.query(
    `UPDATE mmt_pools 
     SET token_a_reserve = token_a_reserve + ?,
         token_b_reserve = token_b_reserve + ?
     WHERE id = ?`,
    [tokenAAmount, tokenBAmount, poolInfo.id]
  );
}

// 유동성 제거 처리 함수
async function handleRemoveLiquidity(
  connection: any,
  poolInfo: any,
  tokenAAmount: number,
  tokenBAmount: number
) {
  // 리저브 검증
  if (tokenAAmount > poolInfo.token_a_reserve || 
      tokenBAmount > poolInfo.token_b_reserve) {
    throw new Error('Insufficient liquidity');
  }

  await connection.query(
    `UPDATE mmt_pools 
     SET token_a_reserve = token_a_reserve - ?,
         token_b_reserve = token_b_reserve - ?
     WHERE id = ?`,
    [tokenAAmount, tokenBAmount, poolInfo.id]
  );
}