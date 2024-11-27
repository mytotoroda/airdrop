declare module '@raydium-io/raydium-sdk-v2' {
  import { Connection, PublicKey } from '@solana/web3.js';
  
  export interface AmmV3PoolInfo {
    tokenA: {
      amount: number;
    };
    tokenB: {
      amount: number;
    };
  }

  export interface ClmmPoolInfo {
    tokenA: {
      amount: number;
    };
    tokenB: {
      amount: number;
    };
    currentPrice: number;
  }

  export class AmmV3 {
    static getPools(params: {
      connection: Connection;
      poolIds: PublicKey[];
    }): Promise<AmmV3PoolInfo[]>;
  }

  export class Clmm {
    static getPool(params: {
      connection: Connection;
      poolId: PublicKey;
    }): Promise<ClmmPoolInfo>;

    static getPoolApr(params: {
      connection: Connection;
      poolId: PublicKey;
      period: string;
    }): Promise<{
      fee24h: number;
      fee7d: number;
      fee30d: number;
      apy24h: number;
      apy7d: number;
      apy30d: number;
    }>;
  }
}