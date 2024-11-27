// components/test/TestNavigation.tsx
'use client';

import React from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Container,
  useTheme,
  alpha
} from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme as useNextTheme } from 'next-themes';
import {
  LineChart,
  Settings2,
  History,
  BarChart2,
  Wallet,
  Settings,
  ListFilter,
  Droplets
} from 'lucide-react';

const allTabs = [
  { 
    label: 'Get Pool Info by ID', 
    path: '/test/getpool',
    icon: LineChart,
    description: 'Get Pool Info by ID'
  },
  { 
    label: 'Get Pool id by Coin address', 
    path: '/test/getpoolid',
    icon: Droplets,
    description: 'Get Pool id by Coin address'
  },
  { 
    label: 'Swap Test', 
    path: '/test/swap',
    icon: Droplets,
    description: 'Swap Test'
  },
  { 
    label: 'Auth transaction Test', 
    path: '/test/web3auth-transaction',
    icon: Droplets,
    description: 'Auth transaction Test'
  },
];

export default function TestNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // 수정된 getActiveTab 함수
  const getActiveTab = () => {
    // 정확한 경로 매칭을 위해 끝에 있는 슬래시 제거
    const normalizedPathname = pathname?.endsWith('/') 
      ? pathname.slice(0, -1) 
      : pathname;

    const index = allTabs.findIndex(tab => {
      if (tab.path === '/mmt') {
        return normalizedPathname === '/mmt';
      }
      return normalizedPathname === tab.path;
    });

    return index === -1 ? 0 : index; // 매칭되는 탭이 없으면 대시보드 선택
  };

  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: isDarkMode ? 'rgb(17, 24, 39)' : 'rgb(249, 250, 251)',
        borderBottom: 1,
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        transition: 'background-color 0.2s ease',
      }}
    >
      <Container maxWidth="xl">
        <Tabs 
          value={getActiveTab()} 
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 56,
            '& .MuiTabs-indicator': {
              backgroundColor: isDarkMode 
                ? 'rgb(96, 165, 250)' // blue-400
                : 'rgb(59, 130, 246)', // blue-500
            },
            '& .MuiTabs-scrollButtons': {
              color: isDarkMode 
                ? 'rgb(156, 163, 175)' 
                : 'rgb(75, 85, 99)',
              '&.Mui-disabled': {
                opacity: 0.3,
              },
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
              minHeight: 56,
              color: isDarkMode 
                ? 'rgb(156, 163, 175)' // gray-400
                : 'rgb(75, 85, 99)', // gray-600
              '&:hover': {
                color: isDarkMode 
                  ? 'rgb(243, 244, 246)' // gray-100
                  : 'rgb(31, 41, 55)', // gray-800
                backgroundColor: isDarkMode 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(0, 0, 0, 0.05)',
              },
              '&.Mui-selected': {
                color: isDarkMode 
                  ? 'rgb(96, 165, 250)' // blue-400
                  : 'rgb(59, 130, 246)', // blue-500
                fontWeight: 600,
              },
              transition: 'color 0.2s ease, background-color 0.2s ease',
            }
          }}
        >
          {allTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Tab
                key={tab.path}
                label={
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                  }}>
                    <Icon size={18} />
                    {tab.label}
                  </Box>
                }
                onClick={() => router.push(tab.path)}
                sx={{
                  mx: 0.5,
                  px: 2,
                  borderRadius: 1,
                  '&:first-of-type': {
                    ml: 0
                  }
                }}
              />
            );
          })}
        </Tabs>
      </Container>
    </Box>
  );
}