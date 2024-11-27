// hooks/useWeb3AuthSession.ts
'use client';

import { useState, useEffect } from 'react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';

interface Web3AuthSession {
  id: number;
  userId: number;
  loginAt: string;
  ipAddress: string;
  userAgent: string;
  sessionStatus: 'ACTIVE' | 'EXPIRED' | 'LOGGED_OUT';
}

export function useWeb3AuthSession() {
  const { user, isAuthenticated } = useWeb3Auth();
  const [currentSession, setCurrentSession] = useState<Web3AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 현재 세션 조회
  const fetchCurrentSession = async () => {
    if (!user?.wallet) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/auth/session?wallet=${user.wallet}`);
      const data = await response.json();
      
      if (data.success && data.session) {
        setCurrentSession(data.session);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 로그인 시도 기록
  const recordLoginAttempt = async (
    email: string,
    wallet: string,
    status: 'SUCCESS' | 'FAILED',
    errorMessage?: string
  ) => {
    try {
      await fetch('/api/auth/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          walletAddress: wallet,
          status,
          errorMessage
        })
      });
    } catch (error) {
      console.error('Error recording login attempt:', error);
    }
  };

  // 세션 종료
  const endCurrentSession = async () => {
    if (!currentSession?.id) return;

    try {
      setIsLoading(true);
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id
        })
      });
      setCurrentSession(null);
    } catch (error) {
      console.error('Error ending session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.wallet) {
      fetchCurrentSession();
    } else {
      setCurrentSession(null);
    }
  }, [isAuthenticated, user?.wallet]);

  return {
    currentSession,
    isLoading,
    recordLoginAttempt,
    endCurrentSession,
    refreshSession: fetchCurrentSession
  };
}