// components/mmt/performance/ProfitabilityAnalysis.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ProfitabilityAnalysisProps {
  poolId: number;
  tokenASymbol: string;
  tokenBSymbol: string;
}

interface ProfitabilityData {
  dailyROI: number;
  weeklyROI: number;
  monthlyROI: number;
  totalROI: number;
  initialInvestment: number;
  currentValue: number;
  totalFees: number;
  rebalancingCosts: number;
  netProfit: number;
  profitHistory: {
    timestamp: string;
    value: number;
    fees: number;
  }[];
}



export default function ProfitabilityAnalysis({
  poolId,
  tokenASymbol,
  tokenBSymbol
}: ProfitabilityAnalysisProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProfitabilityData | null>(null);

  useEffect(() => {
    const fetchProfitabilityData = async () => {
      if (!poolId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/mmt/analysis/profitability/${poolId}`);
        const result = await response.json();
        
        console.log('Profitability Data Response:', result); // 디버깅용
        console.log('poolId:', poolId); // 디버깅용
        
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || '데이터를 불러오는데 실패했습니다.');
        }
      } catch (error) {
        console.error('Failed to fetch profitability data:', error);
        setError('데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfitabilityData();
  }, [poolId]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        p: 2, 
        bgcolor: theme.palette.mode === 'dark' 
          ? alpha(theme.palette.error.main, 0.1)
          : theme.palette.error.light,
        borderRadius: 1,
        color: theme.palette.error.main
      }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ 
        p: 2, 
        bgcolor: theme.palette.mode === 'dark'
          ? alpha(theme.palette.info.main, 0.1)
          : theme.palette.info.light,
        borderRadius: 1
      }}>
        <Typography>데이터가 없습니다.</Typography>
      </Box>
    );
  }

  const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined) return '0.00';
  return value.toFixed(decimals);
  };

  return (
  <Grid container spacing={3}>
    {/* ROI 카드 */}
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            수익률 (ROI)
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography color="textSecondary">일간</Typography>
              <Typography 
                variant="h6" 
                color={(data?.dailyROI ?? 0) >= 0 ? 'success.main' : 'error.main'}
              >
                {formatNumber(data?.dailyROI)}%
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography color="textSecondary">주간</Typography>
              <Typography 
                variant="h6" 
                color={(data?.weeklyROI ?? 0) >= 0 ? 'success.main' : 'error.main'}
              >
                {formatNumber(data?.weeklyROI)}%
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography color="textSecondary">월간</Typography>
              <Typography 
                variant="h6" 
                color={(data?.monthlyROI ?? 0) >= 0 ? 'success.main' : 'error.main'}
              >
                {formatNumber(data?.monthlyROI)}%
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography color="textSecondary">총 수익률</Typography>
              <Typography 
                variant="h6" 
                color={(data?.totalROI ?? 0) >= 0 ? 'success.main' : 'error.main'}
              >
                {formatNumber(data?.totalROI)}%
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>

    {/* 수익 차트 */}
    <Grid item xs={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            수익 추이
          </Typography>
          <Box sx={{ width: '100%', height: 400 }}>
            {data?.profitHistory && data.profitHistory.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={data.profitHistory}>
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fill: theme.palette.text.secondary }}
                  />
                  <YAxis 
                    tick={{ fill: theme.palette.text.secondary }}
                  />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name="포트폴리오 가치"
                    stroke={theme.palette.primary.main} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="fees" 
                    name="누적 수수료"
                    stroke={theme.palette.secondary.main} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'text.secondary'
                }}
              >
                <Typography>데이터가 없습니다</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);
}