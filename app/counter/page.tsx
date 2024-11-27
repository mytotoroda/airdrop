// app/counter/page.tsx
'use client';

import PageAnalytics from '@/components/analytics/PageAnalytics';
import { useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';

export default function CounterPage() {
  const { publicKey } = useWallet();

  useEffect(() => {
    // 페이지 방문 기록
    const recordPageVisit = async () => {
      try {
        await fetch('/api/analytics/page-visit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pagePath: '/counter',
            walletAddress: publicKey,
            referrer: document.referrer
          }),
        });
      } catch (error) {
        console.error('Failed to record page visit:', error);
      }
    };

    recordPageVisit();
  }, [publicKey]);

  return <PageAnalytics />;
}