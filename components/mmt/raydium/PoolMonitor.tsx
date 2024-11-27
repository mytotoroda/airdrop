// components/mmt/raydium/PoolMonitor.tsx
import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { formatNumber, formatCurrency } from '@/utils/mmt/formatters';
import { PoolService } from '@/lib/mmt/services/poolService';
import { raydiumService } from '@/lib/mmt/raydium';
import { PoolInfo } from '@/types/mmt/pool';
import { Activity, TrendingUp, DollarSign, Droplets } from 'lucide-react';

export default function PoolMonitor({ poolAddress }: { poolAddress: string }) {
  const theme = useTheme();
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const poolService = new PoolService(raydiumService);
    let interval: NodeJS.Timeout;

    const fetchPoolInfo = async () => {
      try {
        const info = await poolService.getPoolInfo(poolAddress);
        setPoolInfo(info);
        setError(null);
      } catch (err) {
        console.error('Error fetching pool info:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    // 초기 로드
    fetchPoolInfo();

    // 30초마다 업데이트
    interval = setInterval(fetchPoolInfo, 30000);

    return () => clearInterval(interval);
  }, [poolAddress]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Loading pool data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, color: 'error.main' }}>
        <Typography>Error: {error.message}</Typography>
      </Box>
    );
  }

  if (!poolInfo) return null;

  return (
    <Card 
      sx={{ 
        background: theme.palette.background.paper,
        borderRadius: 2,
        boxShadow: theme.shadows[3]
      }}
    >
      <CardContent>
        <Grid container spacing={3}>
          {/* 풀 기본 정보 */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, color: theme.palette.text.primary }}>
              {poolInfo.tokenA.symbol}/{poolInfo.tokenB.symbol} Pool
            </Typography>
          </Grid>

          {/* 주요 지표들 */}
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<TrendingUp />}
              title="Current Price"
              value={formatNumber(poolInfo.lastPrice)}
              subtitle={`${poolInfo.tokenB.symbol} per ${poolInfo.tokenA.symbol}`}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<Activity />}
              title="24h Volume"
              value={formatCurrency(poolInfo.volume24h)}
              subtitle="Trading Volume"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<Droplets />}
              title="Liquidity"
              value={formatCurrency(poolInfo.liquidityUsd)}
              subtitle="Total Value Locked"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={<DollarSign />}
              title="Fee APY"
              value={`${formatNumber(poolInfo.fees.apy)}%`}
              subtitle="Annual Yield"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}

function StatCard({ icon, title, value, subtitle }: StatCardProps) {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        bgcolor: theme.palette.mode === 'dark' 
          ? 'rgba(255,255,255,0.05)' 
          : 'rgba(0,0,0,0.02)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box sx={{ 
          color: theme.palette.primary.main,
          mr: 1 
        }}>
          {icon}
        </Box>
        <Typography variant="subtitle2" color="textSecondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="textSecondary">
        {subtitle}
      </Typography>
    </Box>
  );
}