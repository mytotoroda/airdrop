// app/test/layout.tsx
'use client';

import React from 'react';
import { Box } from '@mui/material';
import TestNavigation from '@/components/test/TestNavigation';

interface MMTLayoutProps {
  children: React.ReactNode;
}

export default function MMTLayout({ children }: MMTLayoutProps) {
  return (
      <Box sx={{ minHeight: '100vh' }}>
        <TestNavigation />
        <Box sx={{ 
          p: { xs: 2, sm: 3 },
          maxWidth: 'xl',
          mx: 'auto'
        }}>
          {children}
        </Box>
      </Box>
  );
}