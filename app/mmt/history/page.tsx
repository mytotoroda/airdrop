// app/mmt/history/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { formatNumber } from '@/utils/mmt/formatters';
import { 
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Box,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  useTheme,
  Button,
  Stack,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { Info, Search, X } from 'lucide-react';
import TokenPairSelect from '@/components/mmt/TokenPairSelect';
import { useMMT } from '@/contexts/mmt/MMTContext';

interface Transaction {
  id: number;
  created_at: string;
  token_a_symbol: string;
  token_b_symbol: string;
  action_type: 'SWAP' | 'REBALANCE' | 'LIQUIDITY_ADD' | 'LIQUIDITY_REMOVE';
  token_a_amount: number;
  token_b_amount: number;
  price: number;
  price_impact: number;
  fee_amount: number;
  gas_used: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERTED';
  tx_signature: string;
  total_cost_usd: number;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

interface FilterState {
  search: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERTED' | '';
  action_type?: 'SWAP' | 'REBALANCE' | 'LIQUIDITY_ADD' | 'LIQUIDITY_REMOVE' | '';
}

export default function TransactionHistoryPage() {
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';
  const { selectedPool, isLoading: isPoolLoading } = useMMT();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 0,
    limit: 10,
    total: 0
  });
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    action_type: ''
  });
  
  const fetchTransactions = async () => {
    if (isPoolLoading) return;
    setLoading(true);
    try {
      const poolId = selectedPool?.id;
      const queryParams = new URLSearchParams({
        page: (pagination.page + 1).toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.action_type && { action_type: filters.action_type }),
        ...(poolId && { poolId: poolId.toString() })
      });

      const response = await fetch(`/api/mmt/history?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
        setPagination(prev => ({
          ...prev,
          total: data.total
        }));
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isPoolLoading) {
      fetchTransactions();
      const interval = setInterval(fetchTransactions, 30000); // 30초마다 갱신
      return () => clearInterval(interval);
    }
  }, [pagination.page, pagination.limit, filters, selectedPool?.id, isPoolLoading]);

  const handlePageChange = (event: unknown, newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPagination(prev => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 0
    }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setFilters(prev => ({ ...prev, search: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      action_type: ''
    });
    setPagination(prev => ({ ...prev, page: 0 }));
  };

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'SWAP':
        return '스왑';
      case 'REBALANCE':
        return '재조정';
      case 'LIQUIDITY_ADD':
        return '유동성 추가';
      case 'LIQUIDITY_REMOVE':
        return '유동성 제거';
      default:
        return type;
    }
  };

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'SWAP':
        return 'primary';
      case 'REBALANCE':
        return 'warning';
      case 'LIQUIDITY_ADD':
        return 'success';
      case 'LIQUIDITY_REMOVE':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
      case 'REVERTED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return '성공';
      case 'PENDING':
        return '처리중';
      case 'FAILED':
        return '실패';
      case 'REVERTED':
        return '취소됨';
      default:
        return status;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 풀 선택 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TokenPairSelect />
        </CardContent>
      </Card>

      {/* 검색 및 필터 섹션 */}
      <Paper elevation={0} sx={{
        p: 3,
        mb: 3,
        bgcolor: isDark ? 'rgb(17, 24, 39)' : 'white',
        border: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="TX 서명으로 검색..."
            value={filters.search}
            onChange={handleSearchChange}
            variant="outlined"
            size="small"
            sx={{
              minWidth: 300,
              '& .MuiOutlinedInput-root': {
                bgcolor: isDark ? 'rgb(31, 41, 55)' : 'white',
                '& fieldset': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleClearFilters}
            startIcon={<X size={18} />}
            sx={{
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              color: isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
              '&:hover': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              },
            }}
          >
            필터 초기화
          </Button>
        </Stack>
      </Paper>

      {/* 트랜잭션 테이블 */}
      <Paper 
        elevation={0}
        sx={{
          bgcolor: isDark ? 'rgb(17, 24, 39)' : 'white',
          border: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" fontWeight={500}>
            AMM 트랜잭션 내역
          </Typography>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>시간</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>유형</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>토큰 A 수량</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>토큰 B 수량</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>가격</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>가격 영향</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>수수료</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>가스비용</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>상태</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>TX</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} hover>
                  <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>
                    {new Date(tx.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getActionTypeLabel(tx.action_type)}
                      size="small"
                      color={getActionTypeColor(tx.action_type)}
                      sx={{ minWidth: 80 }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>
                    {formatNumber(tx.token_a_amount)} {tx.token_a_symbol}
                  </TableCell>
                  <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>
                    {formatNumber(tx.token_b_amount)} {tx.token_b_symbol}
                  </TableCell>
                  <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>
                    ${formatNumber(tx.price)}
                  </TableCell>
                  <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>
                    {tx.price_impact ? `${formatNumber(tx.price_impact)}%` : '-'}
                  </TableCell>
                  <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>
                    ${formatNumber(tx.fee_amount)}
                  </TableCell>
                  <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>
                    {formatNumber(tx.gas_used)} SOL
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusLabel(tx.status)}
                      size="small"
                      color={getStatusColor(tx.status)}
                      sx={{ minWidth: 60 }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => window.open(`https://solscan.io/tx/${tx.tx_signature}`, '_blank')}
                      sx={{ 
                        color: isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)',
                        '&:hover': {
                          bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
                        }
                      }}
                    >
                      <Info size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">
                      {loading ? '거래 내역을 불러오는 중...' : '거래 내역이 없습니다.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="페이지당 행:"
	  labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} / 전체 ${count !== -1 ? count : `${to} 이상`}`
          }
          sx={{
            color: isDark ? 'rgb(209, 213, 219)' : 'inherit',
            '.MuiTablePagination-select': {
              color: isDark ? 'rgb(209, 213, 219)' : 'inherit'
            },
            '.MuiTablePagination-selectIcon': {
              color: isDark ? 'rgb(209, 213, 219)' : 'inherit'
            }
          }}
        />
      </Paper>
    </Container>
  );
}