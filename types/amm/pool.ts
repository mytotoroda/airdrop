// types/amm/pool.ts
export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
}

export interface PoolInfo {
  id: string;
  version: number;
  baseMint: string;
  quoteMint: string;
  isProgramAndIdValid: boolean;
}