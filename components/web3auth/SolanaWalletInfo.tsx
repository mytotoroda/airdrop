'use client';

import { useState } from 'react';
import { 
  Button, 
  Card, 
  CardContent, 
  Typography,
  Stack,
  CircularProgress
} from '@mui/material';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { SolanaWallet } from '@/utils/solana';

export default function SolanaWalletInfo() {
  const { isAuthenticated, provider } = useWeb3Auth();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkBalance = async () => {
    if (!provider) return;
    
    setIsLoading(true);
    try {
      const wallet = new SolanaWallet(provider);
      const solBalance = await wallet.getBalance();
      setBalance(solBalance);
    } catch (error) {
      console.error("Failed to get balance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const requestAirdrop = async () => {
    if (!provider) return;
    
    setIsLoading(true);
    try {
      const wallet = new SolanaWallet(provider);
      const signature = await wallet.requestAirdrop();
      if (signature) {
        console.log("Airdrop successful:", signature);
        await checkBalance(); // 잔액 업데이트
      }
    } catch (error) {
      console.error("Failed to request airdrop:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h6" component="div">
            Solana 지갑 정보
          </Typography>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Button 
              variant="contained" 
              onClick={checkBalance}
              disabled={isLoading}
            >
              잔액 확인
            </Button>
            {process.env.NEXT_PUBLIC_NETWORK !== 'mainnet-beta' && (
              <Button 
                variant="contained" 
                onClick={requestAirdrop}
                disabled={isLoading}
              >
                Devnet SOL 받기
              </Button>
            )}
          </Stack>

          {isLoading && <CircularProgress size={24} />}
          
          {balance !== null && (
            <Typography>
              현재 잔액: {balance.toFixed(4)} SOL
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}