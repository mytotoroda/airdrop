// components/mmt/performance/RiskAnalysis.tsx
'use client';

import React from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  LinearProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
} from '@mui/material';
import {
  AlertTriangle,
  TrendingDown,
  Activity,
  ArrowDownRight,
  BarChart2,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

interface RiskData {
  volatility24h: number;
  volatility7d: number;
  maxDrawdown: number;
  maxDrawdownDate: string;
  averageSlippage: number;
  maxSlippage: number;
  rebalanceCount: number;
  failedRebalanceCount: number;
  emergencyStops: number;
  lastEmergencyStop: string | null;
  priceDeviations: Array<{
    timestamp: string;
    deviation: number;
    volume: number;
  }>;
  recentEvents: Array<{
    timestamp: string;
    type: string;
    description: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;
}

interface Props {
  poolId: number;
}

// 숫자 포맷팅 유틸리티 함수
const formatNumber = (value: unknown, decimals: number = 2): string => {
  if (value === null || value === undefined) return '0.00';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (typeof numValue !== 'number' || isNaN(numValue)) {
    console.warn('Invalid number value:', value);
    return '0.00';
  }
  
  return numValue.toFixed(decimals);
};

const formatPercent = (value: unknown): string => {
  if (value === null || value === undefined) return '0.00%';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
  
  if (typeof numValue !== 'number' || isNaN(numValue)) {
    console.warn('Invalid percentage value:', value);
    return '0.00%';
  }
  
  return `${formatNumber(numValue)}%`;
};

export default function RiskAnalysis({ poolId }: Props) {
  const theme = useTheme();
  const [data, setData] = React.useState<RiskData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!poolId) return;

      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/mmt/analysis/risk/${poolId}`);
        const result = await response.json();
        
        console.log('Risk Analysis Response:', result); // 디버깅용
        
        if (result.success) {
          setData(result.data);
        } else {
          throw new Error(result.message || '데이터 로드 실패');
        }
      } catch (err) {
        console.error('Risk Analysis Error:', err);
        setError('리스크 데이터를 불러오는데 실패했습니다.');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [poolId]);

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error"
        sx={{ 
          mt: 2,
          bgcolor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.error.main, 0.1)
            : theme.palette.error.light
        }}
      >
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert 
        severity="info"
        sx={{ 
          mt: 2,
          bgcolor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.info.main, 0.1)
            : theme.palette.info.light
        }}
      >
        리스크 데이터가 없습니다.
      </Alert>
    );
  }

  const RiskMetrics = [
    { 
      title: '일일 변동성',
      value: data?.volatility24h,
      icon: Activity,
      tooltip: '24시간 가격 변동성'
    },
    { 
      title: '주간 변동성',
      value: data?.volatility7d,
      icon: BarChart2,
      tooltip: '7일 가격 변동성'
    },
    { 
      title: '최대 손실률',
      value: data?.maxDrawdown,
      icon: TrendingDown,
      tooltip: '최대 자산 가치 하락률'
    },
    { 
      title: '평균 슬리피지',
      value: data?.averageSlippage,
      icon: ArrowDownRight,
      tooltip: '거래 실행 시 평균 가격 차이'
    },
  ];

  const getEventSeverityColor = (severity: 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (severity) {
      case 'HIGH':
        return theme.palette.error.main;
      case 'MEDIUM':
        return theme.palette.warning.main;
      case 'LOW':
        return theme.palette.info.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  return (
    <Grid container spacing={3}>
      {/* 리스크 지표 */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertTriangle size={20} />
              리스크 지표
            </Typography>
            <Grid container spacing={2}>
              {RiskMetrics.map((metric) => (
                <Grid item xs={6} key={metric.title}>
                  <Tooltip title={metric.tooltip}>
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <metric.icon size={20} />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {metric.title}
                        </Typography>
                      </Box>
                      <Typography variant="h6">
                        {formatPercent(metric.value)}
                      </Typography>
                    </Box>
                  </Tooltip>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* 리밸런싱 상태 */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              리밸런싱 상태
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    총 리밸런싱 횟수
                  </Typography>
                  <Typography variant="h6">
                    {data?.rebalanceCount || 0}회
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    실패한 리밸런싱
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {data?.failedRebalanceCount || 0}회
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    비상 정지 횟수
                  </Typography>
                  <Typography variant="h6" color="error.main">
                    {data?.emergencyStops || 0}회
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    마지막 비상 정지
                  </Typography>
                  <Typography variant="body1">
                    {data?.lastEmergencyStop ? 
                      new Date(data.lastEmergencyStop).toLocaleDateString() : 
                      '-'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* 가격 변동 차트 */}
      {data?.priceDeviations && data.priceDeviations.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                가격 변동성 추이
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.priceDeviations}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp"
                      tick={{ fill: theme.palette.text.primary }}
                    />
                    <YAxis 
                      tick={{ fill: theme.palette.text.primary }}
                    />
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="deviation"
                      name="변동성"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.main}
                      fillOpacity={0.1}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* 최근 이벤트 */}
      {data?.recentEvents && data.recentEvents.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                최근 리스크 이벤트
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>시간</TableCell>
                    <TableCell>유형</TableCell>
                    <TableCell>설명</TableCell>
                    <TableCell>심각도</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.recentEvents.map((event, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {event.timestamp}
                      </TableCell>
                      <TableCell>{event.type}</TableCell>
                      <TableCell>{event.description}</TableCell>
                      <TableCell>
                        <Box 
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            color: getEventSeverityColor(event.severity)
                          }}
                        >
                          <AlertCircle size={16} />
                          {event.severity}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}