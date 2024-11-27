// types/mmt.ts
export interface Pool {
  id: number;
  pool_address: string;
  token_a_symbol: string;
  token_a_address: string;
  token_a_decimals: number;
  token_b_symbol: string;
  token_b_address: string;
  token_b_decimals: number;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
  pool_type: 'AMM' | 'CL';
  current_price: number | null;
  liquidity_usd: number | null;
  creator_wallet: string;
  fee_rate: number;
  volume_24h: number;
  created_at: string;
  updated_at: string;
}