// components/mmt/pools/PoolList.tsx
import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Box,
  Typography,
  Paper,
  useTheme
} from '@mui/material';
import { Edit2, PlayCircle, PauseCircle } from 'lucide-react';
import { NetworkType } from '@/contexts/WalletContext';
import { Pool } from '@/types/mmt/pool';
import { formatTokenPair, formatNumber, formatCurrency } from '@/utils/mmt/formatters';

interface PoolListProps {
  pools: Pool[];
  onToggleStatus: (poolId: number) => Promise<void>;
  onEdit: (pool: Pool) => void;
  network: NetworkType;
}

interface PoolListProps {
  pools: Pool[];
  onToggleStatus: (poolId: number) => Promise<void>;
  onEdit: (pool: Pool) => void;
  network: NetworkType;
}

export default function PoolList({ pools, onToggleStatus, onEdit, network }: PoolListProps) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>풀</TableCell>
              <TableCell align="right">유동성</TableCell>
              <TableCell align="right">24시간 거래량</TableCell>
              <TableCell align="center">상태</TableCell>
              <TableCell align="right">최근 가격</TableCell>
              <TableCell align="center">작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pools
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((pool) => (
              <TableRow key={pool.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                      {formatTokenPair(
                        { symbol: pool.tokenA.symbol },
                        { symbol: pool.tokenB.symbol }
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pool.poolAddress.slice(0, 4)}...{pool.poolAddress.slice(-4)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(pool.liquidityUsd)}
                </TableCell>
                <TableCell align="right">
                  {formatNumber(pool.volume24h)}
                </TableCell>
                <TableCell align="center">
                  <Chip 
                    label={pool.status}
                    size="small"
                    color={
                      pool.status === 'ACTIVE' 
                        ? 'success'
                        : pool.status === 'PAUSED'
                          ? 'warning'
                          : 'error'
                    }
                  />
                </TableCell>
                <TableCell align="right">
                  {formatNumber(pool.lastPrice)}
                </TableCell>
                <TableCell align="center">
                  <IconButton 
                    onClick={() => onToggleStatus(pool.pool_id)}
                    color={pool.status === 'ACTIVE' ? 'error' : 'success'}
                    size="small"
                  >
                    {pool.status === 'ACTIVE' ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                  </IconButton>
                  <IconButton
                    onClick={() => onEdit(pool)}
                    color="primary"
                    size="small"
                  >
                    <Edit2 size={20} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={pools.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="페이지당 행:"
        />
      </TableContainer>
    </Box>
  );
}