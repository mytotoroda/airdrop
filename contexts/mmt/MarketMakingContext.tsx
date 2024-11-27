// contexts/mmt/MarketMakingContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { RaydiumService } from '@/lib/mmt/raydium';
import { TokenService } from '@/lib/mmt/services/tokenService';
import type { PoolInfo, TokenInfo } from '@/types/mmt/pool';

interface MarketMakingContextType {
  pools: PoolInfo[];
  selectedPool: PoolInfo | null;
  loading: boolean;
  error: Error | null;
  selectPool: (poolAddress: string) => Promise<void>;
  refreshPools: () => Promise<void>;
}

const MarketMakingContext = createContext<MarketMakingContextType | null>(null);

export function MarketMakingProvider({ children }: { children: React.ReactNode }) {
  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const raydiumService = new RaydiumService();

  const fetchPools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/mmt/pools');
      if (!response.ok) {
        throw new Error('Failed to fetch pools');
      }
      
      const { data } = await response.json();
      setPools(data);
    } catch (err) {
      console.error('Error fetching pools:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const selectPool = async (poolAddress: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/mmt/pools/${poolAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pool details');
      }
      
      const { data } = await response.json();
      setSelectedPool(data);
    } catch (err) {
      console.error('Error selecting pool:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  return (
    <MarketMakingContext.Provider
      value={{
        pools,
        selectedPool,
        loading,
        error,
        selectPool,
        refreshPools: fetchPools,
      }}
    >
      {children}
    </MarketMakingContext.Provider>
  );
}

export function useMarketMaking() {
  const context = useContext(MarketMakingContext);
  if (!context) {
    throw new Error('useMarketMaking must be used within a MarketMakingProvider');
  }
  return context;
}