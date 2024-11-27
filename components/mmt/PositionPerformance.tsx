// components/mmt/PositionPerformance.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Grid,
  ButtonGroup,
  Button,
  Skeleton,
  useTheme,
  Alert
} from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatNumber, formatCurrency } from '@/utils/mmt/formatters';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface PerformanceData {
  timestamp: string;
  value_usd: number;
  token_a_amount: number;
  token_b_amount: number;
  token_a_price: number;
  token_b_price: number;
  roi: number;
  rebalanced: boolean;
}

interface PerformanceMetrics {
  totalValue: number;
  totalROI: number;
  rebalanceCount: number;
  rebalanceCost: number;
  bestDay: {
    date: string;
    roi: number;
  };
  worstDay: {
    date: string;
    roi: number;
  };
}

interface PositionPerformanceProps {
  poolId: number;
  tokenASymbol: string;
  tokenBSymbol: string;
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | 'ALL';

export default function PositionPerformance({
  poolId,
  tokenASymbol,
  tokenBSymbol
}: PositionPerformanceProps) {
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';

  const [timeRange, setTimeRange] = useState<TimeRange>('1W');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/mmt/positions/${poolId}/performance?range=${timeRange}`
      );
      const data = await response.json();
      
      if (data.success) {
        setPerformanceData(data.performance);
        setMetrics(data.metrics);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError('성과 데이터를 불러오는 중 오류가 발생했습니다.');
      console.error('Performance data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [poolId, timeRange]);

  const getROIColor = (value: number) => {
    if (value > 0) return muiTheme.palette.success.main;
    if (value < 0) return muiTheme.palette.error.main;
    return isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)';
  };

  if (loading) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          bgcolor: isDark ? 'rgb(17, 24, 39)' : 'white',
          border: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <Skeleton variant="rectangular" height={400} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        bgcolor: isDark ? 'rgb(17, 24, 39)' : 'white',
        border: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* 헤더 */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" component="h2" fontWeight={600}>
          포지션 성과 분석
        </Typography>
        <ButtonGroup size="small">
          {(['1D', '1W', '1M', '3M', 'ALL'] as TimeRange[]).map((range) => (
            <Button
              key={range}
              onClick={() => setTimeRange(range)}
              variant={timeRange === range ? 'contained' : 'outlined'}
            >
              {range}
            </Button>
          ))}
        </ButtonGroup>
      </Box>

      {/* 주요 지표 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              총 가치
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {formatCurrency(metrics?.totalValue || 0)}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              총 수익률
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {metrics?.totalROI !== undefined && (
                metrics.totalROI > 0 ? 
                  <TrendingUp size={20} color={getROIColor(metrics.totalROI)} /> :
                  <TrendingDown size={20} color={getROIColor(metrics.totalROI)} />
              )}
              <Typography
                variant="h6"
                fontWeight={600}
                color={getROIColor(metrics?.totalROI || 0)}
              >
                {formatNumber(metrics?.totalROI || 0)}%
              </Typography>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              리밸런싱 횟수
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {metrics?.rebalanceCount || 0}회
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={12} md={3}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              리밸런싱 비용
            </Typography>
            <Typography variant="h6" fontWeight={600}>
              {formatCurrency(metrics?.rebalanceCost || 0)}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* 성과 차트 */}
      <Box height={400} mb={3}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={performanceData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} 
            />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
              stroke={isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)'} 
            />
            <YAxis 
              yAxisId="left"
              stroke={isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)'}
              tickFormatter={(value) => `$${formatNumber(value)}`}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              stroke={isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)'}
              tickFormatter={(value) => `${formatNumber(value)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? 'rgb(17, 24, 39)' : 'white',
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                borderRadius: '4px',
              }}
              formatter={(value: any) => [
                typeof value === 'number' ? 
                  value.toString().includes('.') ? 
                    `${formatNumber(value)}${value > 100 ? '$' : '%'}` : 
                    formatCurrency(value) :
                  value,
                ''
              ]}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="value_usd"
              stroke={muiTheme.palette.primary.main}
              name="포트폴리오 가치"
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="roi"
              stroke={muiTheme.palette.secondary.main}
              name="수익률"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* 최고/최저 성과 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderRadius: 1,
              borderColor: 'success.main',
              bgcolor: isDark ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.05)'
            }}
          >
            <Typography variant="body2" color="success.main" gutterBottom>
              최고 수익률
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" color="success.main" fontWeight={600}>
                {formatNumber(metrics?.bestDay.roi || 0)}%
              </Typography>
              <Box display="flex" alignItems="center" gap={1} color="text.secondary">
                <Calendar size={16} />
                <Typography variant="body2">
                  {metrics?.bestDay.date ? 
                    new Date(metrics.bestDay.date).toLocaleDateString() :
                    '-'
                  }
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderRadius: 1,
              borderColor: 'error.main',
              bgcolor: isDark ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.05)'
            }}
          >
            <Typography variant="body2" color="error.main" gutterBottom>
              최저 수익률
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" color="error.main" fontWeight={600}>
                {formatNumber(metrics?.worstDay.roi || 0)}%
              </Typography>
              <Box display="flex" alignItems="center" gap={1} color="text.secondary">
                <Calendar size={16} />
                <Typography variant="body2">
                  {metrics?.worstDay.date ? 
                    new Date(metrics.worstDay.date).toLocaleDateString() :
                    '-'
                  }
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}