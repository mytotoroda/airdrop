'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import * as web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import { useWallet } from './WalletContext'

// Token Metadata Program ID
const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

interface TokenData {
  id: string
  balance: number
  decimals: number
  supply: string
  created: string
  name: string
  symbol: string
  uri: string
}

interface TokenContextType {
  tokens: TokenData[]
  loading: boolean
  refreshTokens: () => Promise<void>
}

const TokenContext = createContext<TokenContextType | undefined>(undefined)

export function TokenProvider({ children }: { children: ReactNode }) {
  const { publicKey, wallet, network } = useWallet()
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [loading, setLoading] = useState(false)

  // 네트워크에 따른 RPC URL 설정
  const getRpcUrl = () => {
    if (network === 'mainnet-beta') {
      // 메인넷의 경우 환경 변수에서 RPC URL 가져오기
      const mainnetUrls = [
        process.env.NEXT_PUBLIC_MAINNET_RPC_URL,
        process.env.NEXT_PUBLIC_MAINNET_RPC_URL2
      ].filter(Boolean);
      
      // 랜덤하게 하나의 URL 선택 (로드 밸런싱)
      return mainnetUrls[Math.floor(Math.random() * mainnetUrls.length)] || web3.clusterApiUrl('mainnet-beta');
    }
    
    return web3.clusterApiUrl('devnet');
  };

  // Connection 인스턴스 생성 함수
  const getConnection = () => {
    const rpcUrl = getRpcUrl();
    return new web3.Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint: network === 'mainnet-beta' 
        ? rpcUrl.replace('https', 'wss')
        : undefined
    });
  };

  const fetchMetadataFromExplorer = async (mintAddress: string) => {
    try {
      const connection = getConnection();
      const [metadataPDA] = web3.PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          new web3.PublicKey(mintAddress).toBuffer()
        ],
        TOKEN_METADATA_PROGRAM_ID
      );

      const metadataAccount = await connection.getAccountInfo(metadataPDA);
      
      if (metadataAccount) {
        const data = metadataAccount.data;
        
        // Raw 데이터 변환
        const rawData = Array.from(data);
        const rawHexData = Array.from(data)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ');
        const rawUtf8Data = new TextDecoder().decode(data);

        // 메타데이터 구조 분석
        let name = 'Unknown';
        let symbol = 'UNKNOWN';
        let uri = '';

        // 1. 문자열 청크 찾기
        const textChunks: { start: number; text: string }[] = [];
        let currentChunk = '';
        let chunkStart = -1;

        for (let i = 0; i < rawData.length; i++) {
          const byte = rawData[i];
          if (byte >= 32 && byte <= 126) {
            if (chunkStart === -1) chunkStart = i;
            currentChunk += String.fromCharCode(byte);
          } else {
            if (currentChunk.length >= 3) {
              textChunks.push({ start: chunkStart, text: currentChunk });
            }
            currentChunk = '';
            chunkStart = -1;
          }
        }

        if (currentChunk.length >= 3) {
          textChunks.push({ start: chunkStart, text: currentChunk });
        }

        // 2. 청크 분석
        for (let i = 0; i < textChunks.length; i++) {
          const chunk = textChunks[i].text;
          
          if (chunk.match(/^https?:\/\//)) {
            uri = chunk;
            continue;
          }

          if (name === 'Unknown' && 
              chunk.match(/^[a-zA-Z\s]+$/) &&
              chunk.length >= 3 && chunk.length <= 20 &&
              chunk.trim().length > 0) {
            name = chunk.trim();
            continue;
          }
          
          if (name !== 'Unknown' && symbol === 'UNKNOWN' && 
              chunk.match(/^[A-Z]+$/) &&
              chunk.length >= 2 && chunk.length <= 10) {
            symbol = chunk;
            continue;
          }
        }

        console.log('Metadata parsed for', mintAddress, ':', {
          name,
          symbol,
          uri,
          network,
          textChunks
        });

        return {
          name,
          symbol,
          uri,
          rawData,
          rawHexData,
          rawUtf8Data,
          debugInfo: {
            textChunks,
            fullData: rawData,
            foundName: name,
            foundSymbol: symbol
          }
        };
      }

      return {
        name: 'Unknown',
        symbol: 'UNKNOWN',
        uri: '',
        rawData: [],
        rawHexData: '',
        rawUtf8Data: ''
      };
    } catch (error) {
      console.error('메타데이터 조회 실패:', error);
      return {
        name: 'Unknown',
        symbol: 'UNKNOWN',
        uri: '',
        rawData: [],
        rawHexData: '',
        rawUtf8Data: ''
      };
    }
  };

  const fetchTokenAccounts = async () => {
    if (!publicKey) return

    setLoading(true)
    try {
      const connection = getConnection();
      
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        new web3.PublicKey(publicKey),
        {
          programId: token.TOKEN_PROGRAM_ID,
        }
      )

      const tokenData: TokenData[] = await Promise.all(
        tokenAccounts.value.map(async (account) => {
          const mintPubkey = new web3.PublicKey(account.account.data.parsed.info.mint)
          let mintInfo;
          let retryCount = 0;
          const maxRetries = 3;

          // 민트 정보 조회 시 재시도 로직
          while (retryCount < maxRetries) {
            try {
              mintInfo = await token.getMint(connection, mintPubkey);
              break;
            } catch (error) {
              retryCount++;
              if (retryCount === maxRetries) throw error;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          const metadata = await fetchMetadataFromExplorer(mintPubkey.toString())
          
          return {
            id: account.account.data.parsed.info.mint,
            balance: account.account.data.parsed.info.tokenAmount.uiAmount,
            decimals: mintInfo!.decimals,
            supply: mintInfo!.supply.toString(),
            created: new Date().toISOString().split('T')[0],
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri
          }
        })
      )

      console.log('Found tokens on', network, ':', tokenData)
      setTokens(tokenData)
    } catch (error) {
      console.error('토큰 데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 지갑이나 네트워크가 변경되면 토큰 데이터 다시 조회
  useEffect(() => {
    if (publicKey) {
      fetchTokenAccounts()
    } else {
      setTokens([]) // 지갑 연결이 해제되면 토큰 목록 초기화
    }
  }, [publicKey, network])

  const value = {
    tokens,
    loading,
    refreshTokens: fetchTokenAccounts
  }

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  )
}

export function useTokens() {
  const context = useContext(TokenContext)
  if (context === undefined) {
    throw new Error('useTokens must be used within a TokenProvider')
  }
  return context
}