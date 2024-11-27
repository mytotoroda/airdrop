// components/mmt/pools/EmptyState.tsx
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { Info } from 'lucide-react';

export function EmptyState() {
  const theme = useTheme();

  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <Box sx={{ mb: 2 }}>
        <Info size={48} color={theme.palette.text.secondary} />
      </Box>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        등록된 풀이 없습니다
      </Typography>
      <Typography variant="body2" color="text.secondary">
        새로운 풀을 생성하여 마켓메이킹을 시작하세요.
      </Typography>
    </Paper>
  );
}