'use client'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Sun, Moon, LogOut, User } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'  // useCallback 추가
import { useAuth } from '../contexts/AuthContext'
import { useWeb3Auth } from '../contexts/Web3AuthContext'
import { useWeb3AuthLoginHistory } from '@/hooks/useWeb3AuthLoginHistory'
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import Web3AuthModal from '@/components/web3auth/Web3AuthModal'

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => void;
}

interface ThemeContextType {
  theme: string | undefined;
  setTheme: (theme: string) => void;
}

const Navbar: React.FC = () => {
  const { user, logout } = useAuth() as AuthContextType;
  const { theme, setTheme } = useTheme() as ThemeContextType;
  const [mounted, setMounted] = useState<boolean>(false);
  const { 
    isLoading, 
    isAuthenticated, 
    user: web3authUser, 
    login, 
    disconnect 
  } = useWeb3Auth();
  const { recordLoginAttempt } = useWeb3AuthLoginHistory();
  const [balance, setBalance] = useState<number>(0);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // SOL 잔액을 가져오는 함수
  const getBalance = useCallback(async (publicKeyStr: string) => {
    try {
      const network = process.env.NEXT_PUBLIC_NETWORK;
      const endpoint = network === 'mainnet-beta'
        ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL
        : 'https://api.devnet.solana.com';
      
      const connection = new Connection(endpoint!, {
        commitment: 'confirmed',
        wsEndpoint: undefined
      });
      
      const balance = await connection.getBalance(new PublicKey(publicKeyStr));
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return 0;
    }
  }, []);

  // 잔액 업데이트 함수
  const updateBalance = useCallback(async () => {
    if (web3authUser?.wallet) {
      const sol = await getBalance(web3authUser.wallet);
      setBalance(sol);
    }
  }, [web3authUser?.wallet, getBalance]);

  // 잔액 자동 업데이트
  useEffect(() => {
    if (web3authUser?.wallet) {
      updateBalance();
      const interval = setInterval(updateBalance, 1200000); // 20분마다 업데이트
      return () => clearInterval(interval);
    }
  }, [web3authUser?.wallet, updateBalance]);

  // hydration 처리
  useEffect(() => {
    setMounted(true);
  }, []);

  // 로그인 핸들러
  const handleLogin = async () => {
    try {
      await login();
      
      if (web3authUser) {
        await recordLoginAttempt({
          email: web3authUser.email,
          walletAddress: web3authUser.wallet,
          status: 'SUCCESS'
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      
      if (web3authUser) {
        await recordLoginAttempt({
          email: web3authUser.email,
          walletAddress: web3authUser.wallet,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : '알 수 없는 오류'
        });
      }
    }
  };

  // 로그아웃 핸들러
  const handleDisconnect = async () => {
    try {
      if (web3authUser) {
        await recordLoginAttempt({
          email: web3authUser.email,
          walletAddress: web3authUser.wallet,
          status: 'SUCCESS',
          errorMessage: 'User logged out'
        });
      }
      await disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  // 프로필 클릭 핸들러
  const handleProfileClick = () => {
    setIsProfileModalOpen(true);
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <nav className="border-b border-gray-200 dark:border-gray-700">
        {/* 상단 줄 */}
        <div className="container mx-auto px-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between h-14">
            {/* 로고 */}
            <Link href="/" className="text-lg font-semibold text-gray-900 dark:text-white">
              Solana App
            </Link>

            {/* 오른쪽 섹션 - 유저 정보, 지갑, 테마 토글 */}
            <div className="flex items-center space-x-4">
              {/* 유저 정보 */}
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    <span className="text-gray-600 dark:text-gray-300">
                      {user.username}
                    </span>
                    <button
                      onClick={logout}
                      className="text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-200"
                  >
                    로그인
                  </Link>
                )}
              </div>

              {/* Web3Auth 연결 */}
              <div className="flex items-center space-x-4">
                {/* 네트워크 표시 */}
                <div className={`px-2 py-1 text-xs rounded-full ${
                  process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
                </div>

                {isLoading ? (
                  <button
                    disabled
                    className="flex items-center px-3 py-1 text-sm bg-gray-400 text-white rounded-lg"
                  >
                    <svg className="animate-spin h-4 w-4 mr-1" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    연결 중...
                  </button>
                ) : isAuthenticated && web3authUser ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleProfileClick}
                      className="flex flex-col items-end p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {web3authUser.profileImage && (
                          <img
                            src={web3authUser.profileImage}
                            alt="Profile"
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {web3authUser.name || web3authUser.email}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {web3authUser.wallet.slice(0, 4)}...{web3authUser.wallet.slice(-4)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {balance.toFixed(4)} SOL
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      연결해제
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLogin}
                    className="flex items-center px-3 py-1 text-sm bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-colors"
                  >
                    <User className="h-4 w-4 mr-1" />
                    로그인
                  </button>
                )}
              </div>

              {/* 테마 토글 버튼 */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-gray-800 dark:text-gray-200" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-800 dark:text-gray-200" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 하단 메뉴 */}
        <div className="container mx-auto px-4 overflow-x-auto">
          <div className="flex items-center space-x-6 h-12 whitespace-nowrap">
            <Link href="/mmt" className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 text-sm font-medium">
              마켓메이킹
            </Link>
            <Link href="/amm" className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 text-sm font-medium">
              마켓관리
            </Link>
            <Link href="/make-wallet" className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 text-sm font-medium">
              지갑주소생성
            </Link>
            <Link href="/airdrops" className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-200 text-sm font-medium">
              에어드랍관리
            </Link>
            <Link href="/contract" className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-200 text-sm font-medium">
              컨트렉트등록
            </Link>
            <Link href="/test/getpool" className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-200 text-sm font-medium">
              Test
            </Link>
          </div>
        </div>
      </nav>
      
      {/* 프로필 모달 */}
      <Web3AuthModal 
        open={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)}
        balance={balance}
        onBalanceUpdate={updateBalance}
      />
    </>
  );
}

export default Navbar;