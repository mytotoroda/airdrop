//contexts/walletContext.tsx
'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Connection, clusterApiUrl } from '@solana/web3.js';

// Network 타입 정의
export type NetworkType = 'mainnet-beta' | 'devnet';

// Phantom 지갑 타입 정의
interface PhantomWallet {
  connect: (args?: { onlyIfTrusted: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  on: (event: string, callback: (args?: any) => void) => void;
  removeAllListeners: (event: string) => void;
  isPhantom?: boolean;
  isConnected?: boolean;
  publicKey?: { toString: () => string };
}

// Window 타입 확장
declare global {
  interface Window {
    solana?: PhantomWallet;
  }
}

// 컨텍스트 값 타입 정의
interface WalletContextValue {
  wallet: PhantomWallet | null;
  publicKey: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  network: NetworkType;
  connection: Connection;
}

// Provider Props 타입 정의
interface WalletProviderProps {
  children: ReactNode;
}

// 상수 정의
const DEFAULT_NETWORK: NetworkType = 'devnet';

// 유틸리티 함수들
const getNetwork = (): NetworkType => {
  const network = process.env.NEXT_PUBLIC_NETWORK as NetworkType;
  if (network !== 'mainnet-beta' && network !== 'devnet') {
    return DEFAULT_NETWORK;
  }
  return network;
};

const getEndpoint = (network: NetworkType): string => {
  return clusterApiUrl(network);
};

const createConnection = (network: NetworkType): Connection => {
  const endpoint = getEndpoint(network);
  return new Connection(endpoint, 'confirmed');
};

// 컨텍스트 생성
const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: WalletProviderProps) {
  const [wallet, setWallet] = useState<PhantomWallet | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const network = getNetwork();
  const [connection] = useState(() => createConnection(network));

  // Phantom 지갑 이벤트 리스너 설정
  useEffect(() => {
    const { solana } = window;
    if (solana) {
      setWallet(solana);

      const handleConnect = () => {
        console.log(`Wallet connected on ${network}`);
        if (solana.publicKey) {
          const publicKeyString = solana.publicKey.toString();
          setPublicKey(publicKeyString);
          localStorage.setItem('walletConnected', 'true');
        }
      };

      const handleDisconnect = () => {
        console.log("Wallet disconnected");
        setPublicKey(null);
        localStorage.removeItem('walletConnected');
      };

      const handleAccountChanged = (publicKey: { toString: () => string } | null) => {
        if (publicKey) {
          console.log("Account changed:", publicKey.toString());
          setPublicKey(publicKey.toString());
          localStorage.setItem('walletConnected', 'true');
        } else {
          setPublicKey(null);
          localStorage.removeItem('walletConnected');
        }
      };

      solana.on('connect', handleConnect);
      solana.on('disconnect', handleDisconnect);
      solana.on('accountChanged', handleAccountChanged);

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        solana.removeAllListeners('connect');
        solana.removeAllListeners('disconnect');
        solana.removeAllListeners('accountChanged');
      };
    }
  }, [network]);

  // 초기 자동 연결
  useEffect(() => {
    const autoConnect = async (): Promise<void> => {
      try {
        const { solana } = window;
        if (solana && localStorage.getItem('walletConnected') === 'true') {
          const response = await solana.connect({ onlyIfTrusted: true });
          setPublicKey(response.publicKey.toString());
        }
      } catch (error) {
        console.error("자동 연결 실패:", error);
        localStorage.removeItem('walletConnected');
      }
    };

    autoConnect();
  }, []);

  const connectWallet = async (): Promise<void> => {
    try {
      if (wallet) {
        if (network === 'mainnet-beta') {
          const confirm = window.confirm(
            '메인넷에 연결하시겠습니까? 실제 SOL이 사용될 수 있습니다.'
          );
          if (!confirm) return;
        }
        const response = await wallet.connect();
        setPublicKey(response.publicKey.toString());
        localStorage.setItem('walletConnected', 'true');
      } else {
        window.open('https://phantom.app/', '_blank');
      }
    } catch (error) {
      console.error("지갑 연결 실패:", error);
      localStorage.removeItem('walletConnected');
    }
  };

  const disconnectWallet = async (): Promise<void> => {
    try {
      if (wallet) {
        await wallet.disconnect();
        setPublicKey(null);
        localStorage.removeItem('walletConnected');
      }
    } catch (error) {
      console.error("지갑 연결 해제 실패:", error);
    }
  };

  return (
    <WalletContext.Provider 
      value={{ 
        wallet, 
        publicKey, 
        connectWallet, 
        disconnectWallet,
        network,
        connection
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// Hook
export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}