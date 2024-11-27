// components/mmt/TradingChart.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box,
  Paper, 
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { format } from 'date-fns';
import { formatCurrency, formatNumber } from '@/utils/mmt/formatters';
import { useTheme as useNextTheme } from 'next-themes';
import { useMMT } from '@/contexts/mmt/MMTContext';

interface ChartData {
  timestamp: string;
  price: number;
  volume: number;
  liquidity: number;
}

const TIME_RANGES = [
  { label: '1H', value: '1h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
];

// 로깅 유틸리티
const logStep = (step: string, data?: any) => {
  console.log('\n--------------------');
  console.log(`[TradingChart] ${step}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('--------------------\n');
};

export default function TradingChart() {
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const { selectedPool } = useMMT();
  
  const [timeRange, setTimeRange] = useState('24h');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch price history data
  useEffect(() => {
    if (!selectedPool) return;

    const fetchChartData = async () => {
      //logStep('Fetching chart data', {
      //  poolId: selectedPool.pool_id,
      //  timeRange
      //});
      
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/mmt/pool-chart/${selectedPool.pool_id}?timeRange=${timeRange}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch chart data');
        }

        const data = await response.json();
        //logStep('Received raw data', { data });
        
        if (data.success && data.data.metrics.priceHistory) {
          const formatted = data.data.metrics.priceHistory.map((item: any) => ({
            timestamp: format(new Date(item.timestamp), 'HH:mm'),
            price: parseFloat(item.price),
            volume: parseFloat(item.volume_24h),
            liquidity: parseFloat(item.liquidity_usd)
          }));
          
          //logStep('Formatted chart data', { formatted });
          setChartData(formatted);
        } else {
          throw new Error('Invalid data format received');
        }
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError('Error loading chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
    const interval = setInterval(fetchChartData, 300000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [selectedPool, timeRange]);

  const handleTimeRangeChange = (_: React.MouseEvent<HTMLElement>, newRange: string) => {
    if (newRange !== null) {
      //logStep('Time range changed', { from: timeRange, to: newRange });
      setTimeRange(newRange);
    }
  };

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length || payload.length < 2) {
    return null;
  }

  const priceData = payload[0]?.value;
  const volumeData = payload[0]?.payload?.volume;

  if (priceData === undefined || volumeData === undefined) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5,
        backgroundColor: isDarkMode ? 'grey.900' : 'grey.100',
        border: 1,
        borderColor: isDarkMode ? 'grey.800' : 'grey.300',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Time: {payload[0]?.payload?.timestamp || 'N/A'}
      </Typography>
      <Typography variant="body2" color="primary">
        Price: {formatCurrency(priceData)}
      </Typography>
      <Typography variant="body2" color="secondary">
        Volume: {formatCurrency(volumeData)}
      </Typography>
      {payload[0]?.payload?.liquidity && (
        <Typography variant="body2" color="text.secondary">
          Liquidity: {formatCurrency(payload[0].payload.liquidity)}
        </Typography>
      )}
    </Paper>
  );
};

  if (!selectedPool) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">
          Please select a token pair to view the chart
        </Typography>
      </Box>
    );
  }

  const tokenPairLabel = `${selectedPool.tokenA.symbol}/${selectedPool.tokenB.symbol}`;

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2 
      }}>
        <Typography variant="h6" color="text.primary">
          Price Chart ({tokenPairLabel})
        </Typography>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 2,
              backgroundColor: isDarkMode ? 'grey.900' : 'grey.100',
              borderColor: isDarkMode ? 'grey.800' : 'grey.300',
              '&.Mui-selected': {
                backgroundColor: isDarkMode ? 'primary.dark' : 'primary.light',
                color: isDarkMode ? 'common.white' : 'primary.main',
                '&:hover': {
                  backgroundColor: isDarkMode ? 'primary.dark' : 'primary.light',
                }
              }
            }
          }}
        >
          {TIME_RANGES.map((range) => (
            <ToggleButton 
              key={range.value} 
              value={range.value}
            >
              {range.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: 'calc(100% - 48px)' 
        }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ 
          p: 3, 
          textAlign: 'center',
          color: 'error.main' 
        }}>
          <Typography>{error}</Typography>
        </Box>
      ) : (
        <Box sx={{ height: 'calc(100% - 48px)', width: '100%' }}>
          {/* Price Chart */}
          <ResponsiveContainer width="100%" height="70%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={isDarkMode ? '#90caf9' : '#1976d2'} 
                    stopOpacity={0.8}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={isDarkMode ? '#90caf9' : '#1976d2'} 
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
              />
              <XAxis 
                dataKey="timestamp" 
                stroke={isDarkMode ? '#fff' : '#666'} 
              />
              <YAxis 
                stroke={isDarkMode ? '#fff' : '#666'}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={isDarkMode ? '#90caf9' : '#1976d2'}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* Volume Chart */}
          {/* Volume Chart */}
<ResponsiveContainer width="100%" height="25%">
  <BarChart
    data={chartData}
    margin={{ top: 5, right: 30, left: 0, bottom: 0 }}
  >
    <CartesianGrid 
      strokeDasharray="3 3" 
      stroke={isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 
    />
    <XAxis 
      dataKey="timestamp" 
      stroke={isDarkMode ? '#fff' : '#666'} 
    />
    <YAxis 
      stroke={isDarkMode ? '#fff' : '#666'}
      tickFormatter={(value) => formatNumber(value)}
    />
    <Tooltip 
      content={<CustomTooltip />}
      cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
    />
    <Bar 
      name="Volume"
      dataKey="volume" 
      fill={isDarkMode ? '#64b5f6' : '#42a5f5'} 
      opacity={0.8}
    />
  </BarChart>
</ResponsiveContainer>
        </Box>
      )}
    </Box>
  );
}