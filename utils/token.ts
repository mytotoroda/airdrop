// utils/token.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';

export const getTokenMetadata = async (
  tokenAddress: string,
  connection: Connection
) => {
  try {
    const mintPubkey = new PublicKey(tokenAddress);
    
    // SPL 토큰 메타데이터 가져오기
    const metadataPDA = await Metadata.getPDA(mintPubkey);
    const metadata = await Metadata.load(connection, metadataPDA);

    if (!metadata) {
      return null;
    }

    return {
      address: tokenAddress,
      name: metadata.data.data.name,
      symbol: metadata.data.data.symbol,
      decimals: metadata.data.data.decimals || 9,
      uri: metadata.data.data.uri
    };

  } catch (error) {
    console.error('Error fetching token metadata:', error);
    // 메타데이터를 가져올 수 없는 경우에도 기본 정보 반환
    return {
      address: tokenAddress,
      name: null,
      symbol: null,
      decimals: 9,
      uri: null
    };
  }
};

// SOL 토큰 정보
export const WRAPPED_SOL = {
  address: 'So11111111111111111111111111111111111111112',
  name: 'Wrapped SOL',
  symbol: 'SOL',
  decimals: 9
};

// 토큰 주소 유효성 검사
export const isValidTokenAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

// 토큰 정보 가져오기 (SOL 또는 일반 토큰)
export const getTokenInfo = async (
  tokenAddress: string,
  connection: Connection
) => {
  // SOL인 경우
  if (tokenAddress === WRAPPED_SOL.address) {
    return WRAPPED_SOL;
  }

  // 일반 토큰인 경우
  return await getTokenMetadata(tokenAddress, connection);
};