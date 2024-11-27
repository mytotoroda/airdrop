// components/airdrop-detail/AirdropExecution.tsx
'use client';

import { useState, useEffect } from 'react';
import { CircularProgress, Alert, AlertTitle } from '@mui/material';

interface AirdropStatus {
  total_wallets: number;
  completed_count: number;
  pending_count: number;
  total_amount: string;
  status: string;
}

export default function AirdropExecution({ campaignId }: { campaignId: string }) {
  const [status, setStatus] = useState<AirdropStatus | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/airdrop/status/${campaignId}`);
        const data = await response.json();
        setStatus(data);
      } catch (error) {
        console.error('Status fetch error:', error);
      }
    };

    fetchStatus();
    if (isExecuting) {
      intervalId = setInterval(fetchStatus, 5000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [campaignId, isExecuting]);

  const executeAirdrop = async () => {
    try {
      setIsExecuting(true);
      setError(null);

      const response = await fetch(`/api/airdrop/execute/${campaignId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('에어드랍 실행 중 오류가 발생했습니다.');
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  if (!status) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          에어드랍 실행
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">
            총 지갑 수
          </h3>
          <p className="text-2xl text-gray-900 dark:text-white">
            {status.total_wallets}
          </p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">
            총 에어드랍 수량
          </h3>
          <p className="text-2xl text-gray-900 dark:text-white">
            {Number(status.total_amount).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>진행률</span>
          <span>
            {Math.round((status.completed_count / status.total_wallets) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{
              width: `${(status.completed_count / status.total_wallets) * 100}%`
            }}
          ></div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center mb-6">
        <div>
          <h4 className="text-sm text-gray-500 dark:text-gray-400">완료</h4>
          <p className="text-xl text-green-600 dark:text-green-400">
            {status.completed_count}
          </p>
        </div>
        <div>
          <h4 className="text-sm text-gray-500 dark:text-gray-400">대기/실패</h4>
          <p className="text-xl text-amber-600 dark:text-amber-400">
            {status.pending_count}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
          <h3 className="font-bold mb-1">에러 발생</h3>
          <p>{error}</p>
        </div>
      )}

      <button
        className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors
          ${isExecuting || status.pending_count === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
          }`}
        onClick={executeAirdrop}
        disabled={isExecuting || status.pending_count === 0}
      >
        {isExecuting ? (
          <div className="flex items-center justify-center space-x-2">
            <CircularProgress size={20} color="inherit" />
            <span>실행 중...</span>
          </div>
        ) : (
          '에어드랍 실행'
        )}
      </button>
    </div>
  );
}