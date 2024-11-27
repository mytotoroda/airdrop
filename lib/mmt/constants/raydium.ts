// lib/mmt/constants/raydium.ts
export const RAYDIUM_POOLS = {
  'SOL-USDC': {
    id: '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2',
    tokens: ['SOL', 'USDC']
  },
  'RAY-SOL': {
    id: 'AVs9TA4nWDzfPJE9gGVNJMVhcQy3V9PGazuz33BfG2RA',
    tokens: ['RAY', 'SOL']
  },
  'RAY-USDC': {
    id: '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg',
    tokens: ['RAY', 'USDC']
  }
};

// 지원되는 토큰 목록
export const SUPPORTED_TOKENS = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    address: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    logoURI: '/tokens/sol.png'
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    logoURI: '/tokens/usdc.png'
  },
  RAY: {
    symbol: 'RAY',
    name: 'Raydium',
    address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    logoURI: '/tokens/ray.png'
  }
};

// 특정 토큰과 페어가 가능한 토큰 목록 반환
export const getValidPairs = (tokenSymbol: string): string[] => {
  return Object.values(RAYDIUM_POOLS)
    .filter(pool => pool.tokens.includes(tokenSymbol))
    .map(pool => pool.tokens.find(t => t !== tokenSymbol))
    .filter((symbol): symbol is string => symbol !== undefined);
};