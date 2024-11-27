// lib/amm/services/swapService.ts

import { 
  Raydium,
  ApiV3PoolInfoStandardItem, 
  AmmV4Keys,
  AmmRpcData,
  ApiPoolInfo 
} from '@raydium-io/raydium-sdk-v2';
import { Connection, PublicKey } from '@solana/web3.js';
import { TokenInfo } from '@/types/amm/pool';
import { RaydiumService } from '../raydium';
import { NATIVE_MINT } from '@solana/spl-token';
import { RAYDIUM_POOLS, SUPPORTED_TOKENS } from '@/constants/amm/raydium';
import BN from 'bn.js';
import Decimal from 'decimal.js';


export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  minAmountOut: string;
  priceImpact: number;
  executionPrice: string;
  fee?: string;
  route?: {
    poolId: string;
    tokenASymbol: string;
    tokenBSymbol: string;
  };
}

export interface SwapParams {
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  slippage?: number;
  wallet?: string;
}

export interface SwapResult {
  txId: string;
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  fee: string;
}

export class SwapService {
  private raydium: RaydiumService;
  private isMainnet: boolean;

  constructor(raydium: RaydiumService) {
    this.raydium = raydium;
    this.isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta';
  }

  async getSwapQuote(params: SwapParams): Promise<SwapQuote> {
    try {
      if (!params.tokenIn || !params.tokenOut || !params.amountIn) {
        throw new Error('Missing required parameters');
      }

      const sdk = await this.raydium.initializeSdk();
      if (!sdk) {
        throw new Error('Failed to initialize Raydium SDK');
      }

      // 토큰 주소 정규화
      const tokenInAddress = this.normalizeTokenAddress(params.tokenIn.address);
      const tokenOutAddress = this.normalizeTokenAddress(params.tokenOut.address);

      // 풀 ID 찾기
      const poolId = this.findPoolId(params.tokenIn.symbol, params.tokenOut.symbol);
      console.log('Using pool ID:', poolId);

      // 풀 정보 가져오기
      let poolInfo: ApiV3PoolInfoStandardItem | undefined;
      let poolKeys: AmmV4Keys | undefined;
      let rpcData: AmmRpcData;

      if (this.isMainnet) {
        // Mainnet의 경우
        const data = await sdk.api.fetchPoolById({ ids: poolId });
        if (!data?.[0]) throw new Error('Pool not found');
        
        poolInfo = data[0] as ApiV3PoolInfoStandardItem;
        if (!this.isValidPoolInfo(poolInfo)) {
          throw new Error('Invalid pool data received');
        }

        poolKeys = await sdk.liquidity.getAmmPoolKeys(poolId);
        rpcData = await sdk.liquidity.getRpcPoolInfo(poolId);
      } else {
        // Devnet의 경우
        const data = await sdk.liquidity.getPoolInfoFromRpc({ poolId });
        poolInfo = data.poolInfo;
        poolKeys = data.poolKeys;
        rpcData = data.poolRpcData;
      }

      if (!poolInfo || !rpcData) {
        throw new Error('Failed to fetch pool information');
      }

      console.log('Pool Info:', {
        baseReserve: rpcData.baseReserve.toString(),
        quoteReserve: rpcData.quoteReserve.toString(),
        status: rpcData.status.toString()
      });

      // 입력 토큰이 base token인지 확인
      const baseIn = tokenInAddress === poolInfo.mintA.address;
      const [mintIn, mintOut] = baseIn 
        ? [poolInfo.mintA, poolInfo.mintB] 
        : [poolInfo.mintB, poolInfo.mintA];

      // 입력 금액을 BN으로 변환
      let amountInBN: BN;
      try {
        const amountInDecimal = new Decimal(params.amountIn);
        if (amountInDecimal.isNaN() || amountInDecimal.isNegative()) {
          throw new Error('Invalid input amount');
        }
        amountInBN = new BN(
          amountInDecimal
            .mul(new Decimal(10).pow(mintIn.decimals))
            .toFixed(0)
        );
      } catch (error) {
        console.error('Amount conversion error:', error);
        throw new Error(`Failed to convert input amount: ${error.message}`);
      }

      // 스왑 계산
      const poolState = {
        id: poolId,
        baseReserve: rpcData.baseReserve,
        quoteReserve: rpcData.quoteReserve,
        status: rpcData.status.toNumber(),
        version: 4
      };

      console.log('Computing swap with pool state:', {
        ...poolState,
        baseReserve: poolState.baseReserve.toString(),
        quoteReserve: poolState.quoteReserve.toString()
      });

      const out = sdk.liquidity.computeAmountOut({
        poolInfo: {
          ...poolInfo,
          ...poolState
        },
        amountIn: amountInBN,
        mintIn: mintIn.address,
        mintOut: mintOut.address,
        slippage: params.slippage || 0.01
      });

      if (!out || !out.amountOut) {
        throw new Error('Swap computation failed');
      }

      // 결과 변환
      const amountOutDecimal = new Decimal(out.amountOut.toString())
        .div(new Decimal(10).pow(mintOut.decimals));

      const minAmountOutDecimal = new Decimal(out.minAmountOut.toString())
        .div(new Decimal(10).pow(mintOut.decimals));

      const executionPrice = this.calculateExecutionPrice(
        new Decimal(params.amountIn),
        amountOutDecimal
      );

      console.log('Swap quote result:', {
        amountIn: params.amountIn,
        amountOut: amountOutDecimal.toString(),
        minAmountOut: minAmountOutDecimal.toString(),
        priceImpact: out.priceImpact || 0,
        executionPrice
      });

      return {
        amountIn: params.amountIn,
        amountOut: amountOutDecimal.toString(),
        minAmountOut: minAmountOutDecimal.toString(),
        priceImpact: out.priceImpact || 0,
        executionPrice,
        fee: out.fee?.toString() || '0',
        route: {
          poolId,
          tokenASymbol: params.tokenIn.symbol,
          tokenBSymbol: params.tokenOut.symbol
        }
      };

    } catch (error) {
      console.error('Swap quote error:', error);
      throw error;
    }
  }



/////////////////////////////////




async executeSwap(params: SwapParams, quote: SwapQuote): Promise<SwapResult> {
  try {
    if (!params.wallet) {
      throw new Error('Wallet address is required');
    }

    // Phantom 지갑 객체 가져오기
    const phantomWallet = window.solana;
    if (!phantomWallet) {
      throw new Error('Phantom wallet not found');
    }

    if (!phantomWallet.publicKey) {
      throw new Error('Wallet not connected');
    }

    console.log('Initiating swap with wallet:', phantomWallet.publicKey.toString());

    // Wallet 어댑터 생성
    const walletAdapter = {
      publicKey: phantomWallet.publicKey,
      signTransaction: async (tx: Transaction) => {
        try {
          return await phantomWallet.signTransaction(tx);
        } catch (error) {
          console.error('Transaction signing error:', error);
          throw new Error('Failed to sign transaction');
        }
      },
      signAllTransactions: async (txs: Transaction[]) => {
        try {
          return await phantomWallet.signAllTransactions(txs);
        } catch (error) {
          console.error('Batch transaction signing error:', error);
          throw new Error('Failed to sign transactions');
        }
      }
    };

    // SDK 초기화
    const sdk = await this.raydium.initializeSdk(walletAdapter);
    if (!sdk) throw new Error('SDK initialization failed');

    if (!quote.route?.poolId) {
      throw new Error('Pool information is missing');
    }

    // 풀 정보 가져오기
    let poolInfo: ApiV3PoolInfoStandardItem | undefined;
    let poolKeys: AmmV4Keys | undefined;
    let rpcData: AmmRpcData;

    console.log('Fetching pool information for:', quote.route.poolId);

    if (this.isMainnet) {
      const data = await sdk.api.fetchPoolById({ ids: quote.route.poolId });
      if (!data?.[0]) throw new Error('Pool not found');
      
      poolInfo = data[0] as ApiV3PoolInfoStandardItem;
      if (!this.isValidAmm(poolInfo.programId)) {
        throw new Error('Target pool is not AMM pool');
      }
      poolKeys = await sdk.liquidity.getAmmPoolKeys(quote.route.poolId);
      rpcData = await sdk.liquidity.getRpcPoolInfo(quote.route.poolId);
    } else {
      const data = await sdk.liquidity.getPoolInfoFromRpc({ poolId: quote.route.poolId });
      poolInfo = data.poolInfo;
      poolKeys = data.poolKeys;
      rpcData = data.poolRpcData;
    }

    if (!poolInfo || !poolKeys || !rpcData) {
      throw new Error('Failed to fetch complete pool information');
    }

    const [baseReserve, quoteReserve, status] = [
      rpcData.baseReserve,
      rpcData.quoteReserve,
      rpcData.status.toNumber()
    ];

    // 토큰 주소 정규화 및 방향 설정
    const tokenInAddress = this.normalizeTokenAddress(params.tokenIn.address);
    const baseIn = tokenInAddress === poolInfo.mintA.address;
    const [mintIn, mintOut] = baseIn 
      ? [poolInfo.mintA, poolInfo.mintB] 
      : [poolInfo.mintB, poolInfo.mintA];

    // 금액 변환
    const amountInBN = new BN(
      new Decimal(params.amountIn)
        .mul(new Decimal(10).pow(params.tokenIn.decimals))
        .toFixed(0)
    );

    const minAmountOutBN = new BN(
      new Decimal(quote.minAmountOut)
        .mul(new Decimal(10).pow(params.tokenOut.decimals))
        .toFixed(0)
    );

    // 토큰 계정 정보 가져오기
    const tokenAccounts = await this.raydium.getTokenAccounts(params.wallet);
    
    console.log('Swap parameters:', {
      poolId: quote.route.poolId,
      amountIn: amountInBN.toString(),
      minAmountOut: minAmountOutBN.toString(),
      tokenInAddress,
      baseIn,
      tokenAccounts: tokenAccounts.length
    });

    // 스왑 트랜잭션 생성
    const { execute } = await sdk.liquidity.swap({
      poolInfo: {
        ...poolInfo,
        baseReserve,
        quoteReserve,
        status,
        version: 4,
      },
      poolKeys,
      userKeys: {
        tokenAccounts,
        owner: walletAdapter.publicKey,
      },
      amountIn: amountInBN,
      minAmountOut: minAmountOutBN,
      fixedSide: 'in',
      tokenIn: baseIn ? 'tokenA' : 'tokenB',
      tokenOut: baseIn ? 'tokenB' : 'tokenA',
      config: {
        forceSplTokenAccount: true, // ATA 사용
        receiveWrapSolToken: false, // Native SOL로 받기
      },
      computeBudgetConfig: {
        units: 400000,
        microLamports: 50000
      }
    });

    // 트랜잭션 실행
    console.log('Executing swap transaction...');
    
    const { txId } = await execute({ 
      wallet: walletAdapter,
      onSuccess: (txid) => {
        console.log('Swap execution succeeded:', txid);
      },
      onError: (error) => {
        console.error('Swap execution failed1:', error);
        throw error;
      }
    });

    console.log('Swap successful:', {
      txId,
      explorerUrl: `https://explorer.solana.com/tx/${txId}${this.isMainnet ? '' : '?cluster=devnet'}`
    });

    return {
      txId,
      amountIn: params.amountIn,
      amountOut: quote.minAmountOut,
      priceImpact: quote.priceImpact,
      fee: quote.fee || '0'
    };

  } catch (error) {
    console.error('Swap execution error:', error);
    if (error instanceof Error) {
      throw new Error(`Swap execution failed2: ${error.message}`);
    }
    throw new Error('Swap execution failed with unknown error');
  }
}

// AMM 유효성 검사 메서드 추가
private isValidAmm(programId: string): boolean {
  // Raydium AMM program IDs
  const validProgramIds = new Set([
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',  // Mainnet AMM
    '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h'   // Devnet AMM
  ]);
  return validProgramIds.has(programId);
}

// 토큰 주소 정규화 메서드
private normalizeTokenAddress(address: string): string {
  if (!address) {
    throw new Error('Token address is required');
  }
  return address === 'SOL' ? NATIVE_MINT.toString() : address;
}

// 토큰 계정 조회 메서드 추가
private async getTokenAccounts(walletAddress: string) {
  try {
    const connection = this.raydium.getConnection();
    const publicKey = new PublicKey(walletAddress);
    
    const response = await connection.getTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });

    return response.value.map(({ pubkey, account }) => ({
      pubkey,
      accountInfo: account
    }));
  } catch (error) {
    console.error('Error fetching token accounts:', error);
    return [];
  }
}

// 풀 정보 유효성 검사 메서드
private isValidPoolInfo(poolInfo: any): boolean {
  return !!(
    poolInfo &&
    poolInfo.mintA &&
    poolInfo.mintA.address &&
    poolInfo.mintA.decimals &&
    poolInfo.mintB &&
    poolInfo.mintB.address &&
    poolInfo.mintB.decimals
  );
}














  private findPoolId(tokenASymbol: string, tokenBSymbol: string): string {
    if (!tokenASymbol || !tokenBSymbol) {
      throw new Error('Token symbols are required');
    }

    const pairKey = `${tokenASymbol}-${tokenBSymbol}`;
    const reversePairKey = `${tokenBSymbol}-${tokenASymbol}`;
    
    console.log('Looking for pool:', { pairKey, reversePairKey });
    
    const pool = RAYDIUM_POOLS[pairKey] || RAYDIUM_POOLS[reversePairKey];
    
    if (!pool || !pool.id) {
      throw new Error(`No pool found for pair ${pairKey}`);
    }

    return pool.id;
  }

  private normalizeTokenAddress(address: string): string {
    if (!address) {
      throw new Error('Token address is required');
    }
    return address === 'SOL' ? NATIVE_MINT.toString() : address;
  }

  private calculateExecutionPrice(amountIn: Decimal, amountOut: Decimal): string {
    try {
      if (!amountIn || amountIn.isZero()) {
        return '0';
      }
      if (!amountOut || amountOut.isZero()) {
        return '0';
      }
      return amountOut.div(amountIn).toString();
    } catch (error) {
      console.error('Error calculating execution price:', error);
      return '0';
    }
  }

  private isValidPoolInfo(poolInfo: any): boolean {
    return !!(
      poolInfo &&
      poolInfo.mintA &&
      poolInfo.mintA.address &&
      poolInfo.mintA.decimals &&
      poolInfo.mintB &&
      poolInfo.mintB.address &&
      poolInfo.mintB.decimals
    );
  }

  public getSupportedTokens(): TokenInfo[] {
    return Object.values(SUPPORTED_TOKENS);
  }
}

// Singleton instance
export const swapService = new SwapService(new RaydiumService());