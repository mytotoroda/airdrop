// app/mmt/layout.tsx
'use client';

import React from 'react';
import { Box } from '@mui/material';
import { MMTProvider } from '@/contexts/mmt/MMTContext';
import MMTNavigation from '@/components/mmt/MMTNavigation';

interface MMTLayoutProps {
  children: React.ReactNode;
}

export default function MMTLayout({ children }: MMTLayoutProps) {
  return (
    <MMTProvider>
      <Box sx={{ minHeight: '100vh' }}>
        <MMTNavigation />
        <Box sx={{ 
          p: { xs: 2, sm: 3 },
          maxWidth: 'xl',
          mx: 'auto'
        }}>
          {children}
        </Box>
      </Box>
    </MMTProvider>
  );
}