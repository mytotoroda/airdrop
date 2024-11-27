// components/mmt/pools/LoadingOverlay.tsx
import { Box, Paper, CircularProgress, Typography } from '@mui/material';

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = '풀 정보 불러오는 중...' }: LoadingOverlayProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
      }}
    >
      <Paper
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          minWidth: 200,
        }}
      >
        <CircularProgress size={24} />
        <Typography>{message}</Typography>
      </Paper>
    </Box>
  );
}

// 로딩 스켈레톤 버전도 추가
export function LoadingContent() {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      height: '400px'
    }}>
      <CircularProgress />
    </Box>
  );
}