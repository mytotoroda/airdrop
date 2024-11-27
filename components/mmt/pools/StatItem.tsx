// components/mmt/pools/StatItem.tsx
import { Box, Typography } from '@mui/material';

interface StatItemProps {
  label: string;
  value: string;
  valueColor?: string;
}

export function StatItem({ 
  label, 
  value, 
  valueColor = 'text.primary' 
}: StatItemProps) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h6" color={valueColor}>
        {value}
      </Typography>
    </Box>
  );
}
