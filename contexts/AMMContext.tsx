'use client';  // 추가된 부분
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { useWallet } from '@/contexts/WalletContext';

// AMM 상태 타입 정의
interface AMMState {
  pools: Pool[];
  selectedPool: Pool | null;
  loading: boolean;
  error: string | null;
}

// 풀 인터페이스 정의
interface Pool {
  id: number;
  poolAddress: string;
  tokenAAddress: string;
  tokenBAddress: string;
  tokenAReserve: number;
  tokenBReserve: number;
  feeRate: number;
  creatorWallet: string;
  status: 'ACTIVE' | 'INACTIVE';
}

// Context 값 타입 정의
interface AMMContextValue extends AMMState {
  // 풀 관련 함수들
  createPool: (tokenA: string, tokenB: string, feeRate: number) => Promise<void>;
  addLiquidity: (poolId: number, amountA: number, amountB: number) => Promise<void>;
  removeLiquidity: (poolId: number, amount: number) => Promise<void>;
  swap: (poolId: number, inputToken: string, amount: number) => Promise<void>;
  
  // 상태 관리 함수들
  selectPool: (pool: Pool) => void;
  refreshPools: () => Promise<void>;
}

const AMMContext = createContext<AMMContextValue | null>(null);

export function AMMProvider({ children }: { children: ReactNode }) {
  const { wallet, publicKey, connection } = useWallet();
  const [state, setState] = useState<AMMState>({
    pools: [],
    selectedPool: null,
    loading: false,
    error: null,
  });

  // 풀 목록 새로고침
  const refreshPools = async () => {
    if (!connection || !publicKey) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/amm/pools');
      const data = await response.json();
      
      if (data.success) {
        setState(prev => ({
          ...prev,
          pools: data.pools,
          loading: false
        }));
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: '풀 정보를 불러오는데 실패했습니다.',
        loading: false
      }));
    }
  };

  // 새로운 풀 생성
  const createPool = async (tokenA: string, tokenB: string, feeRate: number) => {
    if (!wallet || !publicKey) {
      throw new Error('지갑이 연결되어 있지 않습니다.');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/amm/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAAddress: tokenA,
          tokenBAddress: tokenB,
          feeRate,
          creatorWallet: publicKey
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      
      await refreshPools();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || '풀 생성에 실패했습니다.',
        loading: false
      }));
    }
  };

  // 유동성 추가
  const addLiquidity = async (poolId: number, amountA: number, amountB: number) => {
    if (!wallet || !publicKey) {
      throw new Error('지갑이 연결되어 있지 않습니다.');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await fetch('/api/amm/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolId,
          transactionType: 'ADD_LIQUIDITY',
          walletAddress: publicKey,
          tokenAAmount: amountA,
          tokenBAmount: amountB
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.message);

      await refreshPools();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || '유동성 추가에 실패했습니다.',
        loading: false
      }));
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (connection && publicKey) {
      refreshPools();
    }
  }, [connection, publicKey]);

  const value: AMMContextValue = {
    ...state,
    createPool,
    addLiquidity,
    removeLiquidity: async () => {}, // 구현 필요
    swap: async () => {}, // 구현 필요
    selectPool: (pool) => setState(prev => ({ ...prev, selectedPool: pool })),
    refreshPools
  };

  return (
    <AMMContext.Provider value={value}>
      {children}
    </AMMContext.Provider>
  );
}

export function useAMM() {
  const context = useContext(AMMContext);
  if (!context) {
    throw new Error('useAMM must be used within an AMMProvider');
  }
  return context;
}