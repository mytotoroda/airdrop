// hooks/mmt/usePoolData.ts
import { useState, useEffect } from 'react';
import { Pool } from '@/types/mmt/pool';
import { useWallet } from '@/contexts/WalletContext';

export function usePoolData() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { network } = useWallet();

  const fetchPools = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mmt/pools');
      if (!response.ok) throw new Error('Failed to fetch pools');
      
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid response format');
      
      setPools(data);
    } catch (err) {
      console.error('Error fetching pools:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPools();
    const interval = setInterval(fetchPools, 600000);
    return () => clearInterval(interval);
  }, [network]);

  return { pools, loading, error, setError, fetchPools };
}