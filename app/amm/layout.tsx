// app/amm/layout.tsx
'use client';

import React from 'react';
import { Box, useTheme } from '@mui/material';
import AMMNavigation from '@/components/amm/AMMNavigation';

export default function AMMLayout({
  children
}: {
  children: React.ReactNode
}) {
  const theme = useTheme();
  
  return (
    <Box 
      sx={{ 
        minHeight: 'calc(100vh - 64px)',
        bgcolor: 'background.default',
        pt: 2,
        transition: 'background-color 0.2s ease',
      }}
    >
      <Box sx={{
        bgcolor: 'background.default',
        borderBottom: 1,
        borderColor: 'divider',
      }}>
        <AMMNavigation />
      </Box>
      <Box sx={{ 
        color: 'text.primary',
      }}>
        {children}
      </Box>
    </Box>
  );
}