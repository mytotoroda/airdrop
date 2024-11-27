// app/mmt/performance/page.tsx
'use client';

import { useTheme, alpha } from '@mui/material/styles';  // alpha 추가
import {
  Container,
  Box,
  Alert,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
  CircularProgress
} from '@mui/material';
import { TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import TokenPairSelect from '@/components/mmt/TokenPairSelect';
import ProfitabilityAnalysis from '@/components/mmt/performance/ProfitabilityAnalysis';
import RiskAnalysis from '@/components/mmt/performance/RiskAnalysis';
import { useMMT } from '@/contexts/mmt/MMTContext';

export default function PerformancePage() {
  const theme = useTheme();
  const { selectedPool, error, loading } = useMMT();
  const [isDataReady, setIsDataReady] = useState(false);

  // selectedPool이 완전히 로드되었는지 확인
  useEffect(() => {
    if (selectedPool?.pool_id) {
      setIsDataReady(true);
    } else {
      setIsDataReady(false);
    }
  }, [selectedPool]);

  // 에러 처리
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" variant="filled">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          <TrendingUp 
            size={32} 
            color={theme.palette.primary.main}
          />
          AMM 성과 분석
        </Typography>
      </Box>

      {/* 풀 선택 카드 */}
      <Card 
        sx={{ 
          mb: 3,
          bgcolor: theme.palette.background.paper,
          borderColor: theme.palette.divider
        }}
      >
        <CardContent>
          <TokenPairSelect />
        </CardContent>
      </Card>

      {/* 로딩 상태 처리 */}
      {loading && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px'
        }}>
          <CircularProgress />
        </Box>
      )}

      {/* 분석 컴포넌트들 */}
      {!loading && selectedPool && isDataReady ? (
        <Grid container spacing={3}>
          {/* 수익성 분석 */}
          <Grid item xs={12}>
            <Box sx={{ 
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Typography variant="h5" sx={{ 
                color: theme.palette.text.primary,
                fontWeight: 600
              }}>
                수익성 분석
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedPool.tokenA.symbol}/{selectedPool.tokenB.symbol}
              </Typography>
            </Box>
            <ProfitabilityAnalysis
              key={`profit-${selectedPool.pool_id}`}
              poolId={selectedPool.pool_id}
              tokenASymbol={selectedPool.tokenA.symbol}
              tokenBSymbol={selectedPool.tokenB.symbol}
            />
          </Grid>

          {/* 리스크 분석 */}
          <Grid item xs={12}>
            <Box sx={{ 
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <Typography variant="h5" sx={{ 
                color: theme.palette.text.primary,
                fontWeight: 600
              }}>
                리스크 분석
              </Typography>
              <Typography variant="body2" color="text.secondary">
                최근 30일 기준
              </Typography>
            </Box>
            <RiskAnalysis
              key={`risk-${selectedPool.pool_id}`}
              poolId={selectedPool.pool_id}
            />
          </Grid>
        </Grid>
      ) : !loading && !selectedPool ? (
        <Alert 
          severity="info" 
          sx={{ 
            bgcolor: theme.palette.mode === 'dark' 
              ? alpha(theme.palette.info.main, 0.1)
              : theme.palette.info.light
          }}
        >
          분석을 시작하려면 풀을 선택해주세요.
        </Alert>
      ) : null}
    </Container>
  );
}