'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { LinearProgress } from '@mui/material';

const WalletManagement = dynamic(
  () => import('@/components/mmt/WalletManagement'),
  { 
    ssr: false,
    loading: () => <LinearProgress />
  }
);

export default function WalletsPage() {
  return (
    <Suspense fallback={<LinearProgress />}>
      <WalletManagement />
    </Suspense>
  );
}