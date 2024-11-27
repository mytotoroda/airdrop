// components/mmt/pools/PoolTableRow.tsx
import { 
  TableRow as MuiTableRow,
  TableCell, 
  Box, 
  Typography, 
  Chip, 
  IconButton, 
  Tooltip,
  useTheme
} from '@mui/material';
import { ExternalLink, Pencil, Play, Pause } from 'lucide-react';
import { formatNumber } from '@/utils/mmt/formatters';
import { getExplorerUrl } from '@/utils/mmt/networkUtils';

// Pool 타입 정의
interface Pool {
  id: number;
  pool_address: string;
  token_a_symbol: string;
  token_b_symbol: string;
  current_price: number | null;
  liquidity_usd: number | null;
  volume_24h: number;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
  strategy_enabled: boolean;
  pool_type: 'AMM' | 'CL';
}

interface PoolTableRowProps {
  pool: Pool;
  onToggleStatus: (poolId: number, currentEnabled: boolean) => Promise<void>;
  onEdit: (pool: Pool) => void;
  network: string;
}

export function PoolTableRow({ pool, onToggleStatus, onEdit, network }: PoolTableRowProps) {
  const theme = useTheme();

  const statusConfig = {
    ACTIVE: {
      color: "white",
      bgColor: theme.palette.success.dark,
      label: '활성'
    },
    PAUSED: {
      color: theme.palette.warning.main,
      bgColor: theme.palette.warning.light,
      label: '일시중지'
    },
    INACTIVE: {
      color: theme.palette.error.main,
      bgColor: theme.palette.error.light,
      label: '비활성'
    }
  }[pool.status] || {
    color: theme.palette.grey[500],
    bgColor: theme.palette.grey[200],
    label: '알 수 없음'
  };

  return (
    <MuiTableRow>
      {/* 풀 주소 */}
      <TableCell>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          fontFamily: 'monospace'
        }}>
          {pool.pool_address ? (
            <>
              {`${pool.pool_address.slice(0, 4)}...${pool.pool_address.slice(-4)}`}
              <Tooltip title="Explorer에서 보기">
                <IconButton 
                  size="small"
                  onClick={() => window.open(getExplorerUrl(pool.pool_address, network), '_blank')}
                >
                  <ExternalLink size={14} />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            '주소 없음'
          )}
        </Box>
      </TableCell>
      
      {/* 토큰 페어 */}
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {`${pool.token_a_symbol}/${pool.token_b_symbol}`}
        </Typography>
      </TableCell>

      {/* 현재 가격 */}
      <TableCell align="right">
        <Typography variant="body2">
          ${pool.current_price?.toFixed(4) || 'N/A'}
        </Typography>
      </TableCell>

      {/* 24시간 거래량 */}
      <TableCell align="right">
        <Typography variant="body2">
          ${formatNumber(pool.volume_24h)}
        </Typography>
      </TableCell>

      {/* 유동성 */}
      <TableCell align="right">
        <Typography variant="body2">
          ${formatNumber(pool.liquidity_usd || 0)}
        </Typography>
      </TableCell>

      {/* 풀 상태 */}
      <TableCell align="center">
        <Chip
          label={statusConfig.label}
          size="small"
          sx={{
            bgcolor: statusConfig.bgColor,
            color: statusConfig.color,
            fontWeight: 500
          }}
        />
      </TableCell>

      {/* 전략 활성화 상태 */}
      <TableCell align="center">
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Chip
            label={pool.strategy_enabled ? "활성" : "비활성"}
            size="small"
            sx={{
              bgcolor: pool.strategy_enabled 
                ? theme.palette.success.light 
                : theme.palette.grey[200],
              color: pool.strategy_enabled 
                ? theme.palette.success.dark 
                : theme.palette.grey[700],
              fontWeight: 500
            }}
          />
          {pool.strategy_enabled && (
            <Tooltip title="전략 실행 중">
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  animation: 'pulse 2s infinite'
                }}
              />
            </Tooltip>
          )}
        </Box>
      </TableCell>

      {/* 액션 버튼 */}
      <TableCell align="center">
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 1 
        }}>
          <Tooltip title="설정 수정">
            <IconButton 
              size="small"
              onClick={() => onEdit(pool)}
            >
              <Pencil size={18} />
            </IconButton>
          </Tooltip>

          <Tooltip title={pool.strategy_enabled ? "전략 비활성화" : "전략 활성화"}>
            <IconButton 
              size="small"
              onClick={() => onToggleStatus(pool.id, pool.strategy_enabled)}
              color={pool.strategy_enabled ? "error" : "success"}
            >
              {pool.strategy_enabled ? <Pause size={18} /> : <Play size={18} />}
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </MuiTableRow>
  );
}