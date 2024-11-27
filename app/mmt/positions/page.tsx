// app/mmt/positions/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Typography,
  Collapse,
  IconButton,
  useTheme
} from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { ChevronDown, ChevronUp } from 'lucide-react';
import PositionCard from '@/components/mmt/PositionCard';
import RebalanceHistory from '@/components/mmt/RebalanceHistory';
import RebalanceWorkerStatus from '@/components/mmt/RebalanceWorkerStatus';

interface Position {
  id: number;
  pool_id: number;
  token_a_amount: number;
  token_b_amount: number;
  token_a_value_usd: number;
  token_b_value_usd: number;
  total_value_usd: number;
  initial_investment_usd: number;
  current_roi: number | null;
  last_rebalance_at: string;
  rebalance_needed: boolean;
  token_a_symbol: string;
  token_b_symbol: string;
}

export default function PositionsPage() {
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';

  const [positions, setPositions] = useState<Position[]>([]);
  const [rebalanceHistory, setRebalanceHistory] = useState<RebalanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStatusExpanded, setIsStatusExpanded] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const posResponse = await fetch('/api/mmt/positions/current');
      const posData = await posResponse.json();
      if (posData.success) {
        setPositions(posData.positions);
      }

      const historyResponse = await fetch('/api/mmt/positions/rebalance-history');
      const historyData = await historyResponse.json();
      if (historyData.success) {
        setRebalanceHistory(historyData.history);
      }
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRebalance = async (poolId: number) => {
    try {
      const response = await fetch(`/api/mmt/positions/rebalance/${poolId}`, {
        method: 'POST'
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
      await fetchData();
    } catch (error) {
      console.error('Rebalance error:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 900000); // 15분
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 워커 상태 섹션 */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          bgcolor: isDark ? 'rgb(17, 24, 39)' : 'white',
          border: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: isStatusExpanded ? 1 : 0,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
          }}
          onClick={() => setIsStatusExpanded(!isStatusExpanded)}
        >
          <Typography variant="subtitle1" fontWeight={500}>
            자동 리밸런싱 시스템
          </Typography>
          <IconButton size="small">
            {isStatusExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </IconButton>
        </Box>
        <Collapse in={isStatusExpanded}>
          <Box p={2}>
            <RebalanceWorkerStatus />
          </Box>
        </Collapse>
      </Paper>

      {/* 포지션 카드 그리드 */}
      <Grid container spacing={3} mb={4}>
        {positions.map((position) => (
          <Grid item xs={12} md={6} key={position.id}>
            <PositionCard 
              position={position}
              onRebalance={handleRebalance}
            />
          </Grid>
        ))}
      </Grid>

      {/* 리밸런싱 히스토리 */}
      <RebalanceHistory 
        history={rebalanceHistory}
        onRefresh={fetchData}
      />
    </Container>
  );
}