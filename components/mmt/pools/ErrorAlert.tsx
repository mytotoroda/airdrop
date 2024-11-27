// components/mmt/pools/ErrorAlert.tsx
import { Alert, Box } from '@mui/material';

interface ErrorAlertProps {
  error: string | null;
  onClose: () => void;
}

export function ErrorAlert({ error, onClose }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: { xs: 80, sm: 16 },
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
      }}
    >
      <Alert 
        severity="error"
        onClose={onClose}
        sx={{
          minWidth: 300,
          boxShadow: 3,
        }}
      >
        {error}
      </Alert>
    </Box>
  );
}