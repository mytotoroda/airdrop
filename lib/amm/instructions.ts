// lib/amm/instructions.ts
import { PublicKey, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// AMM 프로그램 ID (실제 배포된 프로그램 ID로 교체 필요)
export const AMM_PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID');

// Instruction 타입 정의
export enum AMMInstructionType {
  InitializePool = 0,
  Swap = 1,
  AddLiquidity = 2,
  RemoveLiquidity = 3
}

// Instruction 데이터 인코딩 함수
function encodeInstructionData(type: AMMInstructionType, data: Buffer): Buffer {
  const instructionData = Buffer.alloc(9); // 1 byte for type + 8 bytes for data
  instructionData.writeUInt8(type, 0);
  data.copy(instructionData, 1);
  return instructionData;
}

export function createInitializePoolInstruction(
  poolAddress: PublicKey,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  authorityAddress: PublicKey,
  feeRate: number
): TransactionInstruction {
  const data = Buffer.alloc(8);
  data.writeFloatLE(feeRate, 0);

  return new TransactionInstruction({
    keys: [
      { pubkey: poolAddress, isSigner: false, isWritable: true },
      { pubkey: tokenAMint, isSigner: false, isWritable: false },
      { pubkey: tokenBMint, isSigner: false, isWritable: false },
      { pubkey: authorityAddress, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: AMM_PROGRAM_ID,
    data: encodeInstructionData(AMMInstructionType.InitializePool, data)
  });
}

export function createSwapInstruction(
  poolAddress: PublicKey,
  userAddress: PublicKey,
  tokenAAccount: PublicKey,
  tokenBAccount: PublicKey,
  amount: number
): TransactionInstruction {
  const data = Buffer.alloc(8);
  data.writeBigUInt64LE(BigInt(amount), 0);

  return new TransactionInstruction({
    keys: [
      { pubkey: poolAddress, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: true },
      { pubkey: tokenAAccount, isSigner: false, isWritable: true },
      { pubkey: tokenBAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: AMM_PROGRAM_ID,
    data: encodeInstructionData(AMMInstructionType.Swap, data)
  });
}

export function createAddLiquidityInstruction(
  poolAddress: PublicKey,
  userAddress: PublicKey,
  tokenAAccount: PublicKey,
  tokenBAccount: PublicKey,
  amountA: number,
  amountB: number
): TransactionInstruction {
  const data = Buffer.alloc(16);
  data.writeBigUInt64LE(BigInt(amountA), 0);
  data.writeBigUInt64LE(BigInt(amountB), 8);

  return new TransactionInstruction({
    keys: [
      { pubkey: poolAddress, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: true },
      { pubkey: tokenAAccount, isSigner: false, isWritable: true },
      { pubkey: tokenBAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: AMM_PROGRAM_ID,
    data: encodeInstructionData(AMMInstructionType.AddLiquidity, data)
  });
}