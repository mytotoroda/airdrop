// components/mmt/pools/NetworkStatus.tsx
import { Box, Typography, Paper } from '@mui/material';

interface NetworkStatusProps {
  network: string;
}

export function NetworkStatus({ network }: NetworkStatusProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        display: { xs: 'none', sm: 'flex' },
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Paper
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          px: 2,
          borderRadius: 2,
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: network === 'mainnet-beta' ? 'success.main' : 'warning.main',
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {network === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
        </Typography>
      </Paper>
    </Box>
  );
}