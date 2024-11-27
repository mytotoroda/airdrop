// lib/mmt/constants.ts

export type NetworkType = 'mainnet-beta' | 'devnet';

export interface NetworkConstants {
  POOLS: Record<string, string>;
  TOKENS: Record<string, {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
  }>;
}

export const NETWORK_CONSTANTS: Record<NetworkType, NetworkConstants> = {
  'mainnet-beta': {
    POOLS: {
      'SOL-USDC': '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
      'USDC-SOL': '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
      'RAY-SOL': 'AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA',
      'RAY-USDC': '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg'
    },
    TOKENS: {
      SOL: {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9
      },
      USDC: {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      },
      RAY: {
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        symbol: 'RAY',
        name: 'Raydium',
        decimals: 6
      }
    }
  },
  'devnet': {
    POOLS: {
      'SOL-USDC': 'HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ',
      'USDC-SOL': 'HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ',
    },
    TOKENS: {
      SOL: {
        address: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9
      },
      USDC: {
        address: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6
      }
    }
  }
};

export function getNetwork(): NetworkType {
  return (process.env.NEXT_PUBLIC_NETWORK as NetworkType) || 'devnet';
}

export function getNetworkConstants(): NetworkConstants {
  const network = getNetwork();
  return NETWORK_CONSTANTS[network];
}