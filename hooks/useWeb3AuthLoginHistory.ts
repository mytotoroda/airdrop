'use client';
import { useCallback } from 'react';

interface LoginAttemptParams {
  email: string;
  walletAddress: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  name?: string;
  profileImage?: string;
  provider?: string;
}

export function useWeb3AuthLoginHistory() {
  const recordLoginAttempt = useCallback(async ({ 
    email, 
    walletAddress, 
    status, 
    errorMessage,
    name,
    profileImage,
    provider 
  }: LoginAttemptParams) => {
    try {
      const response = await fetch('/api/auth/web3auth/login-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          walletAddress,
          name,
          profileImage,
          provider,
          status,
          userAgent: navigator.userAgent,
          errorMessage
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record login attempt');
      }
      return await response.json();
    } catch (error) {
      console.error('Error recording login attempt:', error);
    }
  }, []);

  return { recordLoginAttempt };
}