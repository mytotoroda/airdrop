// components/mmt/pools/MobileActions.tsx
import { Box, Button } from '@mui/material';
import { Plus } from 'lucide-react';

interface MobileActionsProps {
  onNewPool: () => void;
  disabled?: boolean;
}

export function MobileActions({ onNewPool, disabled }: MobileActionsProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        p: 2,
        display: { sm: 'none' },
        zIndex: 1000,
      }}
    >
      <Button
        fullWidth
        variant="contained"
        startIcon={<Plus size={18} />}
        onClick={onNewPool}
        disabled={disabled}
      >
        새 풀 생성
      </Button>
    </Box>
  );
}