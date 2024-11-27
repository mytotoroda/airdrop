// types/mmt/pool.ts

import { PublicKey } from '@solana/web3.js';

export interface PoolConfig {
  bidSpread: number;
  askSpread: number;
  minOrderSize: number;
  maxOrderSize: number;
  minOrderInterval: number;
  maxPositionSize: number;
  autoRebalance: boolean;
  rebalanceThreshold: number;
}

export interface RaydiumPoolInfo {
  baseDecimals: number;
  quoteDecimals: number;
  lpDecimals: number;
  baseReserve: number;
  quoteReserve: number;
  lpSupply: number;
  startTime: number;
  programId: string;
  ammId: string;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
}

export interface Pool {
  id: number;
  poolAddress: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
  lastPrice: number;
  volume24h: number;
  liquidityUsd: number;
  enabled: boolean;
  config: PoolConfig;
  raydiumPool?: RaydiumPoolInfo;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePoolParams {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  initialLiquidityA?: number;
  initialLiquidityB?: number;
  feeRate: number;
  config: PoolConfig;
}

export interface PoolKeys {
  id: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  lpMint: PublicKey;
  baseVault: PublicKey;
  quoteVault: PublicKey;
  ammConfig: PublicKey;
  ammId: PublicKey;
  authority: PublicKey;
  program: PublicKey;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string | null;
  supply?: string;
}

export interface PoolInfo {
  poolAddress: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  fees: {
    feeRate: number;
    apy: number;
  };
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
  lastPrice: string;
  volume24h: string;
  liquidityUsd: string;
  updatedAt: Date;
}