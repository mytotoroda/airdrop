// components/mmt/pools/PoolStats.tsx
import { Paper } from '@mui/material';
import { Pool } from '@/types/mmt/pool';
import { formatNumber } from '@/utils/mmt/formatters';
import { StatItem } from './StatItem';

interface PoolStatsProps {
  pools: Pool[];
}

export function PoolStats({ pools }: PoolStatsProps) {
  const stats = {
    totalPools: pools.length,
    activePools: pools.filter(p => p.status === 'ACTIVE').length,
    totalLiquidity: pools.reduce((sum, p) => sum + p.liquidityUsd, 0),
    totalVolume: pools.reduce((sum, p) => sum + p.volume24h, 0),
  };

  return (
    <Paper sx={{ mt: 3, p: 2, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      <StatItem
        label="총 풀 수"
        value={stats.totalPools.toString()}
      />
      
      <StatItem
        label="활성 풀"
        value={stats.activePools.toString()}
        valueColor="success.main"
      />
      
      <StatItem
        label="총 유동성"
        value={stats.totalLiquidity.toString()} 
      />
      
      <StatItem
        label="24시간 거래량"
        value={stats.totalVolume.toString()} 
      />
    </Paper>
  );
}