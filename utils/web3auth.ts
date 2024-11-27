// utils/web3auth.ts

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export async function getSOLBalance(wallet: string): Promise<number> {
  try {
    const connection = new Connection(
      process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta'
        ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL!
        : 'https://api.devnet.solana.com'
    );
    
    const publicKey = new PublicKey(wallet);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    return 0;
  }
}

export function shortAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.substring(0, chars)}...${address.substring(address.length - chars)}`;
}

export async function handleTransaction(
  userId: number,
  txHash: string,
  type: string,
  tokenInAddress: string,
  tokenInAmount: number,
  tokenOutAddress: string,
  tokenOutAmount: number
) {
  try {
    const response = await fetch('/api/auth/web3auth/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        txHash,
        type,
        tokenInAddress,
        tokenInAmount,
        tokenOutAddress,
        tokenOutAmount
      })
    });
    
    return response.json();
  } catch (error) {
    console.error('Error handling transaction:', error);
    throw error;
  }
}

export async function toggleFavoritePair(
  userId: number,
  tokenAAddress: string,
  tokenBAddress: string,
  isFavorite: boolean
) {
  try {
    const response = await fetch('/api/auth/web3auth/favorite-pairs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        tokenAAddress,
        tokenBAddress,
        isFavorite
      })
    });
    
    return response.json();
  } catch (error) {
    console.error('Error toggling favorite pair:', error);
    throw error;
  }
}