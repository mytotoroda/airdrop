// components/common/LoadingOverlay.tsx
import { Box, CircularProgress, useTheme } from '@mui/material';

export default function LoadingOverlay() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: isDark 
          ? 'rgba(0, 0, 0, 0.7)' 
          : 'rgba(255, 255, 255, 0.8)',
        zIndex: 1000,
        backdropFilter: 'blur(2px)',
      }}
    >
      <CircularProgress 
        sx={{
          color: theme.palette.primary.main
        }}
      />
    </Box>
  );
}