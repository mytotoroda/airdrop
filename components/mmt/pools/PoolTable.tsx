import { Pool } from '@/types/mmt/pool';
import { PoolTableRow } from './PoolTableRow';

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
  Tabs,
  Tab,
  useTheme
} from '@mui/material';

interface PoolTableProps {
  pools: Pool[];
  onToggleStatus: (poolId: number, currentEnabled: boolean) => Promise<void>;
  onEdit: (pool: Pool) => void;
  network: string;
}

export function PoolTable({ pools, onToggleStatus, onEdit, network }: PoolTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>풀 주소</TableCell>
            <TableCell>토큰 페어</TableCell>
            <TableCell align="right">현재가</TableCell>
            <TableCell align="right">24시간 거래량</TableCell>
            <TableCell align="right">유동성</TableCell>
            <TableCell align="center">상태</TableCell>
            <TableCell align="center">MM 활성화</TableCell>
            <TableCell align="center">작업</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pools.map((pool) => (
            <PoolTableRow
              key={pool.id}
              pool={pool}
              onToggleStatus={onToggleStatus}
              onEdit={onEdit}
              network={network}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}