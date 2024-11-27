// components/mmt/PositionCard.tsx
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  Alert
} from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  RefreshCcw,
  Settings,
  Info
} from 'lucide-react';
import { formatNumber, formatCurrency } from '@/utils/mmt/formatters';
import RebalanceProgressModal from './RebalanceProgressModal';

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

interface PositionCardProps {
  position: Position;
  onRebalance: (poolId: number) => Promise<void>;
}

export default function PositionCard({ position, onRebalance }: PositionCardProps) {
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';

  // 상태 관리
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRebalanceProgressOpen, setIsRebalanceProgressOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [rebalanceError, setRebalanceError] = useState<string | null>(null);

  const getROIColor = (roi: number | null | undefined) => {
    const value = roi ?? 0;
    if (value > 0) return muiTheme.palette.success.main;
    if (value < 0) return muiTheme.palette.error.main;
    return isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)';
  };

  const ROIIndicator = ({ value }: { value: number | null | undefined }) => {
    const displayValue = value ?? 0;
    
    return (
      <Box display="flex" alignItems="center" gap={1} color={getROIColor(displayValue)}>
        {displayValue > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        {displayValue.toFixed(2)}%
      </Box>
    );
  };

  const handleRebalanceClick = () => {
    setIsConfirmDialogOpen(true);
  };

  const handleRebalanceConfirm = async () => {
    setIsRebalancing(true);
    setRebalanceError(null);
    setIsConfirmDialogOpen(false);
    setIsRebalanceProgressOpen(true);

    try {
      await onRebalance(position.pool_id);
    } catch (error) {
      setRebalanceError(error instanceof Error ? error.message : '리밸런싱 중 오류가 발생했습니다.');
    } finally {
      setIsRebalancing(false);
    }
  };

  return (
    <>
      <Card 
        elevation={0}
        sx={{
          bgcolor: isDark ? 'rgb(17, 24, 39)' : 'white',
          border: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" component="h2" 
              sx={{ 
                color: isDark ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                fontWeight: 600 
              }}
            >
              {position.token_a_symbol}/{position.token_b_symbol}
            </Typography>
            <Box display="flex" gap={1} alignItems="center">
              {position.rebalance_needed && (
                <Tooltip title="리밸런싱이 필요합니다">
                  <Chip
                    icon={<AlertCircle size={16} />}
                    label="리밸런싱 필요"
                    color="warning"
                    size="small"
                  />
                </Tooltip>
              )}
              <Tooltip title="상세 정보">
                <IconButton size="small" onClick={() => setIsDetailsOpen(true)}>
                  <Info size={18} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color={isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)'}>
                총 가치
              </Typography>
              <Typography variant="h6" 
                sx={{ 
                  color: isDark ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
                  fontWeight: 600 
                }}
              >
                {formatCurrency(position.total_value_usd)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color={isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)'}>
                수익률
              </Typography>
              <ROIIndicator value={position.current_roi} />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color={isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)'}>
                {position.token_a_symbol} 수량
              </Typography>
              <Typography variant="body1" color={isDark ? 'rgb(243, 244, 246)' : 'inherit'}>
                {formatNumber(position.token_a_amount)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color={isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)'}>
                {position.token_b_symbol} 수량
              </Typography>
              <Typography variant="body1" color={isDark ? 'rgb(243, 244, 246)' : 'inherit'}>
                {formatNumber(position.token_b_amount)}
              </Typography>
            </Grid>
          </Grid>

          <Box display="flex" gap={1} mt={2}>
            <Button
              variant="contained"
              startIcon={<RefreshCcw size={16} />}
              onClick={handleRebalanceClick}
              disabled={isRebalancing}
              fullWidth
            >
              리밸런싱
            </Button>
            <Button
              variant="outlined"
              startIcon={<Settings size={16} />}
              onClick={() => setIsDetailsOpen(true)}
              fullWidth
            >
              설정
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 리밸런싱 확인 대화상자 */}
      <Dialog 
        open={isConfirmDialogOpen} 
        onClose={() => !isRebalancing && setIsConfirmDialogOpen(false)}
      >
        <DialogTitle>리밸런싱 확인</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>
              다음 포지션에 대해 리밸런싱을 실행하시겠습니까?
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              풀: {position.token_a_symbol}/{position.token_b_symbol}
            </Typography>
            {rebalanceError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {rebalanceError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setIsConfirmDialogOpen(false)} 
            disabled={isRebalancing}
          >
            취소
          </Button>
          <Button 
            onClick={handleRebalanceConfirm}
            variant="contained"
            disabled={isRebalancing}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* 상세 정보 대화상자 */}
      <Dialog 
        open={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {position.token_a_symbol}/{position.token_b_symbol} 포지션 상세
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                초기 투자금
              </Typography>
              <Typography variant="body1">
                {formatCurrency(position.initial_investment_usd)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                현재 가치
              </Typography>
              <Typography variant="body1">
                {formatCurrency(position.total_value_usd)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                마지막 리밸런싱
              </Typography>
              <Typography variant="body1">
                {position.last_rebalance_at ? 
                  new Date(position.last_rebalance_at).toLocaleString() : 
                  '없음'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                현재 수익률
              </Typography>
              <Typography variant="body1">
                <ROIIndicator value={position.current_roi} />
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDetailsOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 리밸런싱 진행 모달 */}
      <RebalanceProgressModal 
        open={isRebalanceProgressOpen}
        onClose={() => setIsRebalanceProgressOpen(false)}
        poolId={position.id}
        tokenASymbol={position.token_a_symbol}
        tokenBSymbol={position.token_b_symbol}
        initialTokenAAmount={position.token_a_amount}
        initialTokenBAmount={position.token_b_amount}
        targetRatio={0.5} // TODO: 설정에서 가져오도록 수정 필요
      />
    </>
  );
}