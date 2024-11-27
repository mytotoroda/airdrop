'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { ThemeProvider as NextThemeProvider } from 'next-themes';
import { WalletProvider } from '../contexts/WalletContext';
import { AuthProvider } from '../contexts/AuthContext';
import { TokenProvider } from '../contexts/TokenContext';
import { AMMProvider } from '../contexts/AMMContext';
import { Web3AuthProvider } from '../contexts/Web3AuthContext';
import { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { useAppTheme } from '@/hooks/useAppTheme';
import { MarketMakingProvider } from '../contexts/mmt/MarketMakingContext';

// 전역 window 타입 확장
declare global {
  interface Window {
    global: Window;
    Buffer: typeof Buffer;
    process: NodeJS.Process;
  }
}

// window 객체 설정
if (typeof window !== 'undefined') {
  window.global = window;
  window.Buffer = window.Buffer || require('buffer').Buffer;
  window.process = window.process || require('process');
}

const inter = Inter({ subsets: ['latin'] });

// Props 타입 정의
interface RootLayoutProps {
  children: ReactNode;
}

// MUI 테마 래퍼 컴포넌트
function ThemeWrapper({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

// 앱 프로바이더 래퍼 컴포넌트
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Web3AuthProvider>
        <WalletProvider>
          <TokenProvider>
            <AMMProvider>
              <MarketMakingProvider>
                {children}
              </MarketMakingProvider>
            </AMMProvider>
          </TokenProvider>
        </WalletProvider>
      </Web3AuthProvider>
    </AuthProvider>
  );
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AppProviders>
          <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ThemeWrapper>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-grow">
                  {children}
                </main>
                <Footer />
              </div>
            </ThemeWrapper>
          </NextThemeProvider>
        </AppProviders>
      </body>
    </html>
  );
}