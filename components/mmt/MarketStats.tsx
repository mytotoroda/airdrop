// components/mmt/MarketStats.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper,
  CircularProgress,
  useTheme 
} from '@mui/material';
import { 
  TrendingUp,
  DollarSign,
  Clock,
  Percent,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useMMT } from '@/contexts/mmt/MMTContext';

interface MarketData {
  lastPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  updatedAt: string;
}

// 로깅 유틸리티
const logStep = (step: string, data?: any) => {
  console.log('\n--------------------');
  console.log(`[MarketStats] ${step}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('--------------------\n');
};

export default function MarketStats() {
  const theme = useTheme();
  const { selectedPool } = useMMT();
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedPool?.pool_id) {
      fetchMarketData();
      const interval = setInterval(fetchMarketData, 300000); // 30초마다 업데이트
      
      return () => clearInterval(interval);
    }
  }, [selectedPool]);

  const fetchMarketData = async () => {
  if (!selectedPool) return;

  try {
    //logStep('Fetching market data', { poolId: selectedPool.pool_id });
    setLoading(true);
    
    const response = await fetch(`/api/mmt/stats/${selectedPool.pool_id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch market stats');
    }

    const data = await response.json();
    //logStep('Received data', data);

    if (data.success) {
      setMarketData({
        lastPrice: parseFloat(data.data.lastPrice),
        priceChange24h: parseFloat(data.data.priceChange24h),
        priceChangePercent24h: parseFloat(data.data.priceChangePercent24h),
        high24h: parseFloat(data.data.high24h),
        low24h: parseFloat(data.data.low24h),
        volume24h: parseFloat(data.data.volume24h),
        marketCap: parseFloat(data.data.marketCap),
        updatedAt: data.data.updatedAt
      });
      //logStep('Market data updated', marketData);
    } else {
      throw new Error(data.message || 'Failed to fetch market stats');
    }
  } catch (error) {
    console.error('Failed to fetch market stats:', error);
  } finally {
    setLoading(false);
  }
};


  const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
      ...options
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
      return `$${(num / 1e3).toFixed(2)}K`;
    }
    return `$${num.toFixed(2)}`;
  };

  const renderStatCard = (
    title: string, 
    value: string | number | React.ReactNode, 
    icon: React.ReactNode, 
    color?: string
  ) => (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        '&:hover': {
          bgcolor: theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)' 
            : 'rgba(0, 0, 0, 0.02)'
        }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Box 
          sx={{ 
            mr: 1,
            color: color || 'primary.main',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography 
        variant="h6" 
        sx={{ 
          color: color || 'text.primary',
          fontWeight: 'medium'
        }}
      >
        {value}
      </Typography>
    </Paper>
  );

  if (!selectedPool) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Typography color="text.secondary">
          Please select a pool to view market stats
        </Typography>
      </Box>
    );
  }

  if (loading || !marketData) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  const priceColor = marketData.priceChange24h >= 0 
    ? theme.palette.success.main 
    : theme.palette.error.main;

  const PriceChangeIcon = marketData.priceChange24h >= 0 
    ? ArrowUpRight 
    : ArrowDownRight;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        mb: 3
      }}>
        <TrendingUp size={20} />
        <Typography variant="h6" component="h2" sx={{ color: 'text.primary' }}>
          {`${selectedPool.tokenA.symbol}/${selectedPool.tokenB.symbol} Stats`}
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ flex: 1 }}>
       <Grid item xs={12} sm={6}>
          {renderStatCard(
            "Last Price",
            <>
              ${formatNumber(marketData.lastPrice)}
              <Box 
                component="span" 
                sx={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  ml: 1,
                  color: priceColor,
                  fontSize: '0.875rem'
                }}
              >
                <PriceChangeIcon size={16} />
                {formatNumber(Math.abs(marketData.priceChangePercent24h))}%
              </Box>
            </>,
            <DollarSign size={18} />,
            priceColor
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          {renderStatCard(
            "24h Volume",
            formatCurrency(marketData.volume24h),
            <TrendingUp size={18} />
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          {renderStatCard(
            "24h High",
            `$${formatNumber(marketData.high24h)}`,
            <ArrowUpRight size={18} />,
            theme.palette.success.main
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          {renderStatCard(
            "24h Low",
            `$${formatNumber(marketData.low24h)}`,
            <ArrowDownRight size={18} />,
            theme.palette.error.main
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          {renderStatCard(
            "Market Cap",
            formatCurrency(marketData.marketCap),
            <DollarSign size={18} />
          )}
        </Grid>

        <Grid item xs={12} sm={6}>
          {renderStatCard(
            "24h Change",
            <Box 
              sx={{ 
                display: 'flex',
                alignItems: 'center',
                color: priceColor
              }}
            >
              <PriceChangeIcon size={18} style={{ marginRight: '4px' }} />
              {`${marketData.priceChange24h >= 0 ? '+' : ''}${formatNumber(marketData.priceChange24h)}`}
            </Box>,
            <Percent size={18} />,
            priceColor
          )}
        </Grid>
      </Grid>

      <Box sx={{ 
        mt: 2, 
        pt: 2, 
        borderTop: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 1
      }}>
        <Clock size={14} />
        <Typography variant="caption" color="text.secondary">
          Last updated: {new Date(marketData.updatedAt).toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
}