// components/mmt/RebalanceHistory.tsx
'use client';

import { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  useTheme,
  Tooltip
} from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { 
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { formatCurrency } from '@/utils/mmt/formatters';
import RebalanceHistoryDetail from './RebalanceHistoryDetail';

interface RebalanceHistory {
  id: number;
  pool_id: number;
  trigger_type: 'AUTO' | 'MANUAL' | 'EMERGENCY';
  trigger_reason: string;
  token_a_before: number;
  token_b_before: number;
  token_a_after: number;
  token_b_after: number;
  cost_gas_usd: number;
  cost_slip_usd: number;
  total_cost_usd: number;
  status: string;  // 데이터베이스의 실제 status 값을 확인해야 합니다
  created_at: string;
  token_a_symbol: string;
  token_b_symbol: string;
}

interface RebalanceHistoryProps {
  history: RebalanceHistory[];
  onRefresh: () => void;
}

export default function RebalanceHistory({ history, onRefresh }: RebalanceHistoryProps) {
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Status 타입에 따른 처리를 좀 더 안전하게 수정
  const getStatusChip = (status: string) => {
    // 기본 설정
    let Icon = Clock;
    let color: 'warning' | 'success' | 'error' | 'default' = 'default';
    let label = status;

    // 상태에 따른 아이콘과 색상 설정
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
      case 'COMPLETED':
        Icon = CheckCircle;
        color = 'success';
        break;
      case 'FAILED':
      case 'ERROR':
        Icon = AlertTriangle;
        color = 'error';
        break;
      case 'PENDING':
        Icon = Clock;
        color = 'warning';
        break;
      default:
        Icon = Clock;
        color = 'default';
    }

    return (
      <Chip
        icon={<Icon size={16} />}
        label={label}
        size="small"
        color={color}
        sx={{ borderRadius: 1 }}
      />
    );
  };

  const getTriggerChip = (type: RebalanceHistory['trigger_type']) => {
    return (
      <Chip 
        label={type}
        size="small"
        color={type === 'EMERGENCY' ? 'error' : 'default'}
        sx={{ borderRadius: 1 }}
      />
    );
  };

  return (
    <>
      <Paper 
        elevation={0}
        sx={{
          p: 3,
          bgcolor: isDark ? 'rgb(17, 24, 39)' : 'white',
          border: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6" component="h2" 
            sx={{ 
              color: isDark ? 'rgb(243, 244, 246)' : 'rgb(17, 24, 39)',
              fontWeight: 600 
            }}
          >
            리밸런싱 히스토리
          </Typography>
          <IconButton onClick={onRefresh}>
            <RefreshCw size={20} />
          </IconButton>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>시간</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>풀</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>트리거</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>사유</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>비용</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>상태</TableCell>
                <TableCell sx={{ color: isDark ? 'rgb(209, 213, 219)' : 'inherit' }}>상세</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => (
                <TableRow 
                  key={item.id} 
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:hover td': {
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)'
                    }
                  }}
                >
                  <TableCell sx={{ color: isDark ? 'rgb(243, 244, 246)' : 'inherit' }}>
                    {new Date(item.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ color: isDark ? 'rgb(243, 244, 246)' : 'inherit' }}>
                    {item.token_a_symbol}/{item.token_b_symbol}
                  </TableCell>
                  <TableCell>
                    {getTriggerChip(item.trigger_type)}
                  </TableCell>
                  <TableCell sx={{ color: isDark ? 'rgb(243, 244, 246)' : 'inherit' }}>
                    {item.trigger_reason}
                  </TableCell>
                  <TableCell sx={{ color: isDark ? 'rgb(243, 244, 246)' : 'inherit' }}>
                    {formatCurrency(item.total_cost_usd)}
                  </TableCell>
                  <TableCell>
                    {getStatusChip(item.status)}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="상세 정보">
                      <IconButton 
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Opening detail for ID:', item.id);
                          setSelectedId(item.id);
                        }}
                      >
                        <Eye size={16} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell 
                    colSpan={7} 
                    align="center" 
                    sx={{ 
                      py: 4,
                      color: isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)' 
                    }}
                  >
                    리밸런싱 기록이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 상세 정보 모달 */}
      <RebalanceHistoryDetail
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        rebalanceId={selectedId || 0}
      />
    </>
  );
}