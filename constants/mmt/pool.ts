// constants/mmt/pool.ts

import { PublicKey } from '@solana/web3.js';

export const RAYDIUM_MAINNET_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
export const RAYDIUM_DEVNET_PROGRAM_ID = new PublicKey('HyQDxRJdBoUQcXNx6ydShDQaywxYn4U9caBeLmfV4sNb');

export const DEFAULT_POOL_CONFIG = {
  bidSpread: 0.001,      // 0.1%
  askSpread: 0.001,      // 0.1%
  minOrderSize: 0.1,
  maxOrderSize: 100,
  minOrderInterval: 30,   // seconds
  maxPositionSize: 1000,
  autoRebalance: true,
  rebalanceThreshold: 0.05 // 5%
};

export const POOL_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  INACTIVE: 'INACTIVE'
} as const;

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

export const AMM_CONFIG = {
  TRADE_FEE_NUMERATOR: 25,
  TRADE_FEE_DENOMINATOR: 10000,
  OWNER_TRADE_FEE_NUMERATOR: 5,
  OWNER_TRADE_FEE_DENOMINATOR: 10000,
  OWNER_WITHDRAW_FEE_NUMERATOR: 0,
  OWNER_WITHDRAW_FEE_DENOMINATOR: 0,
  HOST_FEE_NUMERATOR: 0,
  HOST_FEE_DENOMINATOR: 0
};