// components/MarketMaker/MMController.tsx
import { useEffect, useRef } from 'react';

interface MMControllerProps {
  poolId: string;
  enabled: boolean;
  interval?: number; // 실행 간격 (ms), 기본값 15초
  onError?: (error: any) => void;
}

export function MMController({ 
  poolId, 
  enabled, 
  interval = 15000,
  onError 
}: MMControllerProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const executeMMTick = async () => {
      try {
        const response = await fetch(`/api/mmt/execute/${poolId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            network: process.env.NEXT_PUBLIC_NETWORK
          })
        });

        if (!response.ok) {
          throw new Error('MM execution failed');
        }

        const data = await response.json();
        console.log('MM execution result:', data);

      } catch (error) {
        console.error('MM execution error:', error);
        onError?.(error);
      }
    };

    if (enabled) {
      // 초기 실행
      executeMMTick();
      // 주기적 실행 설정
      timerRef.current = setInterval(executeMMTick, interval);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [poolId, enabled, interval, onError]);

  return null;
}