// components/mmt/RebalanceHistoryDetail.tsx
'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Grid,
  Chip,
  Link,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Divider,
  useTheme
} from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { formatNumber, formatCurrency } from '@/utils/mmt/formatters';
import {
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Receipt,
  AlertCircle
} from 'lucide-react';

interface RebalanceDetail {
  id: number;
  pool_id: number;
  trigger_type: 'AUTO' | 'MANUAL' | 'EMERGENCY';
  trigger_reason: string;
  token_a_before: number;
  token_b_before: number;
  token_a_after: number;
  token_b_after: number;
  token_a_price_before: number;
  token_b_price_before: number;
  token_a_price_after: number;
  token_b_price_after: number;
  cost_gas_usd: number;
  cost_slip_usd: number;
  total_cost_usd: number;
  tx_signature: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  created_at: string;
  token_a_symbol: string;
  token_b_symbol: string;
}

interface RebalanceHistoryDetailProps {
  open: boolean;
  onClose: () => void;
  rebalanceId: number;
}

export default function RebalanceHistoryDetail({
  open,
  onClose,
  rebalanceId
}: RebalanceHistoryDetailProps) {
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';

  const [detail, setDetail] = useState<RebalanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (open && rebalanceId) {
    console.log('Fetching detail for ID:', rebalanceId);  // 로깅 추가
    fetchDetail();
  }
}, [open, rebalanceId]);

const fetchDetail = async () => {
  setLoading(true);
  setError(null);
  try {
    console.log(`Fetching from: /api/mmt/positions/rebalance-detail/${rebalanceId}`);
    const response = await fetch(`/api/mmt/positions/rebalance-detail/${rebalanceId}`);
    const data = await response.json();
    console.log('Fetched detail data:', data);  // 로깅 추가
    if (data.success) {
      setDetail(data.detail);
    } else {
      throw new Error(data.message);
    }
  } catch (err) {
    console.error('Fetch detail error:', err);  // 에러 로깅 개선
    setError('상세 정보를 불러오는 중 오류가 발생했습니다.');
  } finally {
    setLoading(false);
  }
};

  const calculateChange = (before: number, after: number) => {
    const change = ((after - before) / before) * 100;
    return change;
  };

  if (!detail) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDark ? 'rgb(17, 24, 39)' : 'white',
        }
      }}
    >
      <DialogTitle sx={{ 
        borderBottom: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
      }}>
        <Box display="flex" alignItems="center" gap={1}>
          <ArrowRightLeft size={20} />
          리밸런싱 상세 정보
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* 기본 정보 */}
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                풀
              </Typography>
              <Typography variant="body1">
                {detail.token_a_symbol}/{detail.token_b_symbol}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                실행 시간
              </Typography>
              <Typography variant="body1">
                {new Date(detail.created_at).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                트리거
              </Typography>
              <Chip
                label={detail.trigger_type}
                size="small"
                color={detail.trigger_type === 'EMERGENCY' ? 'error' : 'default'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary">
                상태
              </Typography>
              <Chip
                label={detail.status}
                size="small"
                color={
                  detail.status === 'COMPLETED' ? 'success' :
                  detail.status === 'FAILED' ? 'error' : 'warning'
                }
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* 포지션 변경 */}
          <Typography variant="subtitle2" gutterBottom>
            포지션 변경
          </Typography>
          <Grid container spacing={3} mb={3}>
            {/* Token A */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderRadius: 1,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {detail.token_a_symbol} 포지션
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>변경 전</TableCell>
                      <TableCell align="right">
                        {formatNumber(detail.token_a_before)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>변경 후</TableCell>
                      <TableCell align="right">
                        {formatNumber(detail.token_a_after)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>변화율</TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                          {calculateChange(detail.token_a_before, detail.token_a_after) > 0 ? 
                            <TrendingUp size={16} color={muiTheme.palette.success.main} /> :
                            <TrendingDown size={16} color={muiTheme.palette.error.main} />
                          }
                          {formatNumber(calculateChange(detail.token_a_before, detail.token_a_after))}%
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            </Grid>

            {/* Token B */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  p: 2,
                  border: 1,
                  borderRadius: 1,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }}
              >
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {detail.token_b_symbol} 포지션
                </Typography>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>변경 전</TableCell>
                      <TableCell align="right">
                        {formatNumber(detail.token_b_before)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>변경 후</TableCell>
                      <TableCell align="right">
                        {formatNumber(detail.token_b_after)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>변화율</TableCell>
                      <TableCell align="right">
                        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                          {calculateChange(detail.token_b_before, detail.token_b_after) > 0 ? 
                            <TrendingUp size={16} color={muiTheme.palette.success.main} /> :
                            <TrendingDown size={16} color={muiTheme.palette.error.main} />
                          }
                          {formatNumber(calculateChange(detail.token_b_before, detail.token_b_after))}%
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* 비용 정보 */}
          <Typography variant="subtitle2" gutterBottom>
            비용 정보
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                가스비
              </Typography>
              <Typography variant="body1">
                {formatCurrency(detail.cost_gas_usd)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                슬리피지
              </Typography>
              <Typography variant="body1">
                {formatCurrency(detail.cost_slip_usd)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary">
                총 비용
              </Typography>
              <Typography variant="body1" fontWeight={500}>
                {formatCurrency(detail.total_cost_usd)}
              </Typography>
            </Grid>
          </Grid>

          {/* 트랜잭션 정보 */}
          {detail.tx_signature && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  트랜잭션
                </Typography>
                <Link
                  href={`https://solscan.io/tx/${detail.tx_signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <Receipt size={16} />
                  Explorer
                </Link>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}