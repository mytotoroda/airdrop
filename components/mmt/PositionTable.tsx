// components/mmt/PositionTable.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  useTheme,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown,
  RefreshCcw,
  AlertCircle
} from 'lucide-react';
import { useMMT } from '@/contexts/mmt/MMTContext';
import { formatNumber, formatCurrency, formatPercent } from '@/utils/mmt/formatters';

interface Position {
  tokenAAmount: number;
  tokenBAmount: number;
  tokenAValueUsd: number;
  tokenBValueUsd: number;
  totalValueUsd: number;
  initialInvestmentUsd: number;
  currentRoi: number;
  tokenRatio: number;
  impermanentLossUsd: number;
  feesEarnedUsd: number;
  volume24h: number;
  feeApy: number;
  utilizationRate: number;
}

const PositionTable = () => {
  const theme = useTheme();
  const { selectedPool } = useMMT();
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPool?.pool_id) {
      fetchPosition();
      const interval = setInterval(fetchPosition, 300000); // 30초마다 업데이트
      return () => clearInterval(interval);
    }
  }, [selectedPool]);

  const fetchPosition = async () => {
    if (!selectedPool?.pool_id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/mmt/pos-current/${selectedPool.pool_id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch position');
      }

      const data = await response.json();
      setPosition(data.position);
    } catch (error) {
      console.error('Failed to fetch position:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !position) {
    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <BarChart2 size={20} />
          <Skeleton variant="text" width={200} />
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton variant="text" />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                  <TableCell><Skeleton variant="text" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  }

  const needsRebalancing = Math.abs(position.tokenRatio - 0.5) > 0.1;

  return (
    <Box sx={{ height: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChart2 
            size={20} 
            color={theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main}
          />
          <Typography variant="h6" component="h2" sx={{ color: 'text.primary' }}>
            Position Overview
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {needsRebalancing && (
            <Tooltip title="Pool needs rebalancing">
              <IconButton size="small" color="warning">
                <AlertCircle size={16} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Refresh position data">
            <IconButton size="small" onClick={fetchPosition}>
              <RefreshCcw size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{
        bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
        borderRadius: 1,
        boxShadow: theme.palette.mode === 'dark' ? 1 : 2
      }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Asset</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Value (USD)</TableCell>
              <TableCell align="right">Share</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow hover>
              <TableCell>{selectedPool?.tokenA.symbol}</TableCell>
              <TableCell align="right">{formatNumber(position.tokenAAmount)}</TableCell>
              <TableCell align="right">{formatCurrency(position.tokenAValueUsd)}</TableCell>
              <TableCell align="right">
                {formatPercent(position.tokenRatio)}
              </TableCell>
            </TableRow>
            <TableRow hover>
              <TableCell>{selectedPool?.tokenB.symbol}</TableCell>
              <TableCell align="right">{formatNumber(position.tokenBAmount)}</TableCell>
              <TableCell align="right">{formatCurrency(position.tokenBValueUsd)}</TableCell>
              <TableCell align="right">
                {formatPercent(1 - position.tokenRatio)}
              </TableCell>
            </TableRow>
            <TableRow sx={{ '& td': { fontWeight: 'bold' } }}>
              <TableCell>Total</TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">{formatCurrency(position.totalValueUsd)}</TableCell>
              <TableCell align="right">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 2,
        mt: 3 
      }}>
        <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            ROI
          </Typography>
          <Typography variant="h6" sx={{ 
            color: position.currentRoi >= 0 ? 'success.main' : 'error.main',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}>
            {position.currentRoi >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {formatPercent(position.currentRoi)}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Fee APY
          </Typography>
          <Typography variant="h6" color="text.primary">
            {formatPercent(position.feeApy)}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Impermanent Loss
          </Typography>
          <Typography variant="h6" color="error.main">
            {formatCurrency(position.impermanentLossUsd)}
          </Typography>
        </Paper>
      </Box>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: 2,
        mt: 2 
      }}>
        <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Fees Earned
          </Typography>
          <Typography variant="h6" color="success.main">
            {formatCurrency(position.feesEarnedUsd)}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Utilization Rate
          </Typography>
          <Typography variant="h6" color="text.primary">
            {formatPercent(position.utilizationRate)}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default PositionTable;