import { Connection, clusterApiUrl } from '@solana/web3.js';

export type NetworkType = 'mainnet' | 'devnet';

export const getNetwork = (): NetworkType => {
  return (process.env.NEXT_PUBLIC_NETWORK as NetworkType) || 'devnet';
};

export const getEndpoint = (): string => {
  const network = getNetwork();
  if (network === 'mainnet') {
    return clusterApiUrl('mainnet-beta');
  }
  return clusterApiUrl('devnet');
};

export const getConnection = (): Connection => {
  return new Connection(getEndpoint(), 'confirmed');
};