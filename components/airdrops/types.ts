// components/airdrops/types.ts
export interface Campaign {
  id: number;
  title: string;
  token_address: string;
  token_name: string;
  token_symbol: string;
  amount: string;
  total_recipients: number;
  completed_recipients: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  creator_wallet: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignInput {
  title: string;
  token_address: string;
  token_name: string;
  token_symbol: string;
  amount: string;
  total_recipients: number;
  creator_wallet: string;
}

// 새로 추가할 AirdropRecipient 인터페이스
export interface AirdropRecipient {
  id: number;
  campaign_id: number;
  user_id: number;
  wallet_address: string;
  amount: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  tx_signature: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// 에어드랍 진행 상황을 위한 인터페이스도 추가
export interface AirdropProgress {
  total: number;
  completed: number;
  failed: number;
}