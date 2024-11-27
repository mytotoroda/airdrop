// lib/mmt/services/tokenService.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { RaydiumService } from '../raydium';
import { TokenInfo } from '@/types/mmt/pool';

export class TokenService {
  private raydium: RaydiumService;
  private connection: Connection;

  constructor(raydium: RaydiumService) {
    this.raydium = raydium;
    this.connection = raydium.getConnection();
  }

  /**
   * 토큰 메타데이터 조회
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
    try {
      // 1. API에서 토큰 정보 조회
      const response = await fetch(`/api/mmt/tokens?address=${tokenAddress}`);
      if (!response.ok) {
        throw new Error('Failed to fetch token data');
      }
      
      const { data } = await response.json();
      if (data) {
        return this.formatTokenInfo(data);
      }

      // 2. 온체인에서 토큰 정보 조회
      const tokenMint = new PublicKey(tokenAddress);
      const accountInfo = await this.connection.getParsedAccountInfo(tokenMint);
      
      if (!accountInfo.value?.data || typeof accountInfo.value.data !== 'object') {
        throw new Error('Invalid token account data');
      }

      const { decimals, supply } = (accountInfo.value.data as any).parsed.info;
      
      // 3. 새 토큰 정보 저장
      const tokenInfo = {
        address: tokenAddress,
        decimals,
        supply: supply.toString(),
        symbol: '',
        name: '',
        logoURI: null
      };

      await this.updateTokenMetadata(tokenInfo);
      return tokenInfo;
    } catch (error) {
      console.error('Error fetching token info:', error);
      throw error;
    }
  }

  /**
   * 모든 토큰 목록 조회
   */
  async getAllTokens(): Promise<TokenInfo[]> {
    try {
      const response = await fetch('/api/mmt/tokens');
      if (!response.ok) {
        throw new Error('Failed to fetch tokens');
      }
      
      const { data } = await response.json();
      return data.map(this.formatTokenInfo);
    } catch (error) {
      console.error('Error fetching all tokens:', error);
      return [];
    }
  }

  /**
   * 토큰 메타데이터 업데이트
   */
  private async updateTokenMetadata(token: TokenInfo): Promise<void> {
    try {
      const response = await fetch('/api/mmt/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(token),
      });

      if (!response.ok) {
        throw new Error('Failed to update token metadata');
      }
    } catch (error) {
      console.error('Error updating token metadata:', error);
      throw error;
    }
  }

  private formatTokenInfo(data: any): TokenInfo {
    return {
      address: data.address,
      decimals: data.decimals,
      symbol: data.symbol || '',
      name: data.name || '',
      logoURI: data.logo_uri || null,
      supply: data.supply?.toString()
    };
  }
}