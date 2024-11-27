// contexts/mmt/MMTContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from '@/contexts/WalletContext';

// 타입 정의
interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface AMMPool {
  pool_id: number;
  id: string;
  poolAddress: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  lastPrice: number;
  priceChangePercent24h: number;
  liquidityUsd: number;
  volume24h: number;
  fee: number;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
}

interface PoolConfig {
  baseSpread: number;
  bidAdjustment: number;
  askAdjustment: number;
  checkInterval: number;
  minTokenATrade: number;
  maxTokenATrade: number;
  minTokenBTrade: number;
  maxTokenBTrade: number;
  tradeSizePercentage: number;
  targetRatio: number;
  rebalanceThreshold: number;
  maxPositionSize: number;
  maxSlippage: number;
  stopLossPercentage: number;
  emergencyStop: boolean;
  enabled: boolean;
  minLiquidity: number;
  maxLiquidity: number;
}

interface MMTContextType {
  pools: AMMPool[];
  selectedPool: AMMPool | null;
  poolConfig: PoolConfig | null;
  isLoading: boolean;
  error: string | null;
  setSelectedPool: (pool: AMMPool | null) => void;
  refreshPools: () => Promise<void>;
  refreshPoolConfig: () => Promise<void>;
  updatePoolConfig: (config: Partial<PoolConfig>) => Promise<void>;
}

// 로깅 유틸리티
const logStep = (step: string, data?: any) => {
  console.log('\n--------------------');
  console.log(`[MMTContext] ${step}`);
  if (data) {
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }
  console.log('--------------------\n');
};

// Context 생성
const MMTContext = createContext<MMTContextType | null>(null);

// Provider 컴포넌트
export function MMTProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const [pools, setPools] = useState<AMMPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<AMMPool | null>(null);
  const [poolConfig, setPoolConfig] = useState<PoolConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 풀 목록 가져오기
  const fetchPools = async () => {
    try {
      //logStep('Fetching pools');
      setIsLoading(true);
      const response = await fetch('/api/mmt/pools');
      
      if (!response.ok) {
        throw new Error('Failed to fetch pools');
      }

      const data = await response.json();
      //logStep('Pools fetched', { count: data.length });
      setPools(data);

      // 자동으로 첫 번째 활성 풀 선택
      if (data.length > 0 && !selectedPool) {
        const firstActivePool = data.find(pool => pool.status === 'ACTIVE');
        if (firstActivePool) {
          //logStep('Auto-selecting first active pool', firstActivePool);
          setSelectedPool(firstActivePool);
        }
      }
    } catch (err) {
      //logStep('Error fetching pools', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pools');
      setPools([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 풀 설정 가져오기
  const fetchPoolConfig = async (poolId: number) => {
    try {
      //logStep('Fetching config for pool', { poolId });
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/mmt/pool-config/${poolId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pool configuration');
      }

      const data = await response.json();
      //logStep('Config fetched', data);
      setPoolConfig(data);
    } catch (err) {
      //logStep('Error fetching config', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPoolConfig(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    //logStep('Component mounted, fetching initial data');
    fetchPools();
  }, []);

  // 선택된 풀이 변경될 때마다 설정 가져오기
  useEffect(() => {
    if (selectedPool?.pool_id) {
      //logStep('Selected pool changed, fetching config', { poolId: selectedPool.pool_id });
      fetchPoolConfig(selectedPool.pool_id);
    } else {
      setPoolConfig(null);
    }
  }, [selectedPool]);

  // 풀 목록 새로고침
  const refreshPools = async () => {
    await fetchPools();
  };

  // 풀 설정 새로고침
  const refreshPoolConfig = async () => {
    if (selectedPool?.pool_id) {
      await fetchPoolConfig(selectedPool.pool_id);
    }
  };

  // 풀 설정 업데이트
  const updatePoolConfig = async (config: Partial<PoolConfig>) => {
    if (!selectedPool?.pool_id) return;

    try {
      //logStep('Updating pool config', { poolId: selectedPool.pool_id, config });
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/mmt/config/${selectedPool.pool_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to update pool configuration');
      }

      //logStep('Config updated successfully');
      await refreshPoolConfig();
    } catch (err) {
      //logStep('Error updating config', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: MMTContextType = {
    pools,
    selectedPool,
    poolConfig,
    isLoading,
    error,
    setSelectedPool,
    refreshPools,
    refreshPoolConfig,
    updatePoolConfig
  };

  return (
    <MMTContext.Provider value={contextValue}>
      {children}
    </MMTContext.Provider>
  );
}

// Custom Hook
export function useMMT() {
  const context = useContext(MMTContext);
  if (!context) {
    throw new Error('useMMT must be used within a MMTProvider');
  }
  return context;
}