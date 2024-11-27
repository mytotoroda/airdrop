'use client';

import React from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Container,
  useTheme,
  alpha,
} from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme as useNextTheme } from 'next-themes';
import {
  Repeat,
  Droplets,
  Coins,
  Database,
  History,
  ArrowLeftRight,
  ListFilter,
  Settings
} from 'lucide-react';
const allTabs = [
  { 
    label: '토큰 스왑', 
    path: '/amm',
    icon: Repeat,
    description: '토큰 교환 및 거래'
  },
  { 
    label: '유동성 풀', 
    path: '/amm/pools',
    icon: Droplets,
    description: '유동성 풀 현황 및 참여'
  },
  { 
    label: '토큰 관리', 
    path: '/amm/admin/tokens',
    icon: Coins,
    description: '토큰 관리 및 설정'
  },
  { 
    label: '풀 관리', 
    path: '/amm/admin/pools',
    icon: Database,
    description: '유동성 풀 관리'
  },
  { 
    label: '트랜잭션', 
    path: '/amm/admin/transactions',
    icon: History,
    description: '거래 내역 조회'
  }
];

export default function AMMNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useNextTheme();
  const isDarkMode = resolvedTheme === 'dark';

  const getActiveTab = () => {
    const normalizedPathname = pathname?.endsWith('/') 
      ? pathname.slice(0, -1) 
      : pathname;

    const index = allTabs.findIndex(tab => {
      if (tab.path === '/amm') {
        return normalizedPathname === '/amm';
      }
      return normalizedPathname === tab.path;
    });

    return index === -1 ? 0 : index;
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