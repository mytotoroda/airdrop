// components/mmt/pools/PoolHeader.tsx
import { Box, Typography, Button } from '@mui/material';
import { Plus, RefreshCw, Droplets } from 'lucide-react';

interface PoolHeaderProps {
  onRefresh: () => void;
  onNewPool: () => void;
  loading: boolean;
  isWalletConnected: boolean;
}

export function PoolHeader({ 
  onRefresh, 
  onNewPool, 
  loading, 
  isWalletConnected 
}: PoolHeaderProps) {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 3
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Droplets size={28} />
        <Typography variant="h4">풀 관리</Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={18} />}
          onClick={onRefresh}
          disabled={loading}
        >
          새로고침
        </Button>
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={onNewPool}
          disabled={!isWalletConnected}
        >
          새 풀 생성
        </Button>
      </Box>
    </Box>
  );
}