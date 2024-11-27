// lib/mmt/raydium.ts

import { 
  Connection, 
  Keypair, 
  PublicKey,
} from '@solana/web3.js';
import { 
  Raydium,
  TxVersion,
} from '@raydium-io/raydium-sdk-v2';

const RAYDIUM_API_V3 = 'https://api-v3.raydium.io';

interface TokenInfo {
  chainId: number;
  address: string;
  programId: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  tags: string[];
  extensions: Record<string, unknown>;
}

interface RewardInfo {
  mint: TokenInfo;
  perSecond: string;
  startTime: string;
  endTime: string;
}

interface PeriodStats {
  volume: number;
  volumeQuote: number;
  volumeFee: number;
  apr: number;
  feeApr: number;
  priceMin: number;
  priceMax: number;
  rewardApr: number[];
}

interface PoolConfig {
  id: string;
  index: number;
  protocolFeeRate: number;
  tradeFeeRate: number;
  tickSpacing: number;
  fundFeeRate: number;
  defaultRange: number;
  defaultRangePoint: number[];
}

interface PoolInfo {
  type: string;
  programId: string;
  id: string;
  mintA: TokenInfo;
  mintB: TokenInfo;
  rewardDefaultPoolInfos: string;
  rewardDefaultInfos: RewardInfo[];
  price: number;
  mintAmountA: number;
  mintAmountB: number;
  feeRate: number;
  openTime: string;
  tvl: number;
  day: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  pooltype: string[];
  farmUpcomingCount: number;
  farmOngoingCount: number;
  farmFinishedCount: number;
  config: PoolConfig;
  burnPercent: number;
}

interface ApiResponse {
  count: number;
  data: PoolInfo[];
  hasNextPage: boolean;
}

interface RaydiumApiResponse<T> {
  id: string;
  success: boolean;
  data: T;
  message?: string;
}

const POOL_TYPES = {
  ALL: 'all',
  STANDARD: 'standard',
  CONCENTRATED: 'concentrated'
} as const;

type PoolType = typeof POOL_TYPES[keyof typeof POOL_TYPES];

interface MappedPoolInfo {
  id: string;
  type: string;
  category: string;
  tokenA: {
    symbol: string;
    name: string;
    address: string;
  };
  tokenB: {
    symbol: string;
    name: string;
    address: string;
  };
  price: string;
  tvl: string;
  volume24h: string;
  fee24h: string;
  apr7d: string;
  feeApr7d: string;
  rewardApr7d: string;
  programId: string;
  feeRate: string;
}

export class RaydiumService {
  private connection: Connection;
  private sdk: Raydium | undefined;
  private isMainnet: boolean;
  
  constructor() {
    this.isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta';
    const rpcUrl = this.isMainnet 
      ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL 
      : process.env.NEXT_PUBLIC_DEVNET_RPC_URL;
      
    if (!rpcUrl) {
      throw new Error('RPC URL not configured');
    }

    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  private async fetchRaydiumApi<T>(endpoint: string): Promise<T> {
    try {
      console.log('Fetching from:', `${RAYDIUM_API_V3}${endpoint}`);
      
      const response = await fetch(`${RAYDIUM_API_V3}${endpoint}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: RaydiumApiResponse<T> = await response.json();
      
      if (!data.success) {
        throw new Error(data.msg || 'API request failed');
      }

      return data.data;
    } catch (error) {
      console.error('Raydium API error:', error);
      throw error;
    }
  }

async findPoolByTokens(
  tokenAMint: string, 
  tokenBMint: string, 
  poolType: PoolType = POOL_TYPES.ALL
): Promise<MappedPoolInfo[]> {
  try {
    if (!this.isMainnet) {
      throw new Error('Pool lookup is only supported on mainnet');
    }

    // Build query parameters
    const params = new URLSearchParams({
      mint1: tokenAMint,
      mint2: tokenBMint,
      pageSize: '10',
      page: '1',
      poolSortField: 'liquidity', // 변경됨: sortField -> poolSortField
      sortType: 'desc',
      poolType: poolType // 'standard' | 'concentrated' | 'all'
    });

    console.log('Request URL:', `/pools/info/mint?${params.toString()}`);

    const response = await this.fetchRaydiumApi<ApiResponse>(
      `/pools/info/mint?${params.toString()}`
    );

    if (!response.data || !Array.isArray(response.data)) {
      console.log('Empty or invalid response:', response);
      return [];
    }

    return response.data.map(pool => ({
      id: pool.id,
      type: pool.type,
      category: `${pool.type} Pool`,
      tokenA: {
        symbol: pool.mintA.symbol,
        name: pool.mintA.name,
        address: pool.mintA.address,
      },
      tokenB: {
        symbol: pool.mintB.symbol,
        name: pool.mintB.name,
        address: pool.mintB.address,
      },
      price: pool.price?.toFixed(4) || 'N/A',
      tvl: pool.tvl ? `$${pool.tvl.toLocaleString()}` : 'N/A',
      volume24h: pool.day?.volume ? `$${pool.day.volume.toLocaleString()}` : 'N/A',
      fee24h: pool.day?.volumeFee ? `$${pool.day.volumeFee.toLocaleString()}` : 'N/A',
      apr7d: pool.week?.apr ? `${pool.week.apr.toFixed(2)}%` : 'N/A',
      feeApr7d: pool.week?.feeApr ? `${pool.week.feeApr.toFixed(2)}%` : 'N/A',
      rewardApr7d: pool.week?.rewardApr?.map(apr => `${apr.toFixed(2)}%`).join(' + ') || 'N/A',
      programId: pool.programId,
      feeRate: pool.feeRate ? (pool.feeRate * 100).toFixed(3) : 'N/A'
    }));

  } catch (error) {
    console.error('Error finding pools:', error);
    throw new Error('Failed to fetch pool information');
  }
}

// findAllPools 메서드도 수정
async findAllPools(tokenAMint: string, tokenBMint: string) {
  try {
    // 단일 요청으로 모든 풀 타입 조회
    const pools = await this.findPoolByTokens(tokenAMint, tokenBMint, POOL_TYPES.ALL);
    
    return {
      standard: pools.filter(p => p.type.toLowerCase() === 'standard'),
      concentrated: pools.filter(p => p.type.toLowerCase() === 'concentrated')
    };

  } catch (error) {
    console.error('Error finding all pools:', error);
    throw error;
  }
}

  async getPool(poolAddress: string) {
    try {
      if (!this.isMainnet) {
        throw new Error('Pool lookup is only supported on mainnet');
      }

      const response = await this.fetchRaydiumApi<ApiResponse>(
        `/pools/info/ids?ids=${poolAddress}`
      );

      if (!response.data || response.data.length === 0) {
        throw new Error('Pool not found');
      }

      const pool = response.data[0];
      const accountInfo = await this.connection.getAccountInfo(new PublicKey(poolAddress));

      return {
        id: pool.id,
        poolInfo: pool,
        rawInfo: accountInfo,
        network: 'mainnet-beta'
      };

    } catch (error) {
      console.error('Error fetching pool:', error);
      throw error;
    }
  }

  async initializeSdk() {
    try {
      if (this.sdk) return this.sdk;

      this.sdk = await Raydium.load({
        connection: this.connection,
        cluster: this.isMainnet ? 'mainnet' : 'devnet',
        disableFeatureCheck: true,
        blockhashCommitment: 'finalized',
      });

      return this.sdk;
    } catch (error) {
      console.error('Failed to initialize Raydium SDK:', error);
      throw error;
    }
  }

  getTxVersion(): TxVersion {
    return TxVersion.V0;
  }

  getConnection(): Connection {
    return this.connection;
  }
}

export const raydiumService = new RaydiumService();