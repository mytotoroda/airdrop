// 5-1. hooks/mmt/useStrategy.ts
import { useState, useEffect } from 'react';
import { MarketMakingStrategy } from '@/lib/mmt/types';

export function useStrategy(poolId: number) {
  const [strategy, setStrategy] = useState<MarketMakingStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  
  // 전략 로드 로직
  // 전략 저장 로직
  // 전략 업데이트 로직

  return { strategy, loading, saveStrategy, updateStrategy };
}