// hooks/useWeb3AuthSettings.ts
'use client';

import { useState, useEffect } from 'react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';

interface UserSettings {
  defaultSlippage: number;
  autoApprove: boolean;
  notificationEnabled: boolean;
}

export function useWeb3AuthSettings() {
  const { user, isAuthenticated } = useWeb3Auth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 사용자 설정 조회
  const fetchSettings = async () => {
    if (!user?.wallet) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/auth/web3auth/settings?wallet=${user.wallet}`);
      const data = await response.json();
      
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 설정 업데이트
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!user?.wallet) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/web3auth/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: user.wallet,
          settings: newSettings
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSettings(prev => prev ? { ...prev, ...newSettings } : null);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.wallet) {
      fetchSettings();
    } else {
      setSettings(null);
    }
  }, [isAuthenticated, user?.wallet]);

  return {
    settings,
    isLoading,
    updateSettings,
    refreshSettings: fetchSettings
  };
}