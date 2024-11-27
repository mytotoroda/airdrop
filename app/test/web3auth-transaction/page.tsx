'use client';

import { useState } from 'react';
import { 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  Box,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Connection } from '@solana/web3.js';
import { SolanaWallet } from '@web3auth/solana-provider';
import { AlertTriangle } from 'lucide-react';

export default function Web3AuthTransactionTest() {
  const { 
    provider, 
    isAuthenticated,
    user: web3authUser
  } = useWeb3Auth();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error',
    message: string
  } | null>(null);

  const handleTransferClick = () => {
    if (validateInputs()) {
      setConfirmDialogOpen(true);
    }
  };

  const validateInputs = () => {
    if (!recipientAddress || !amount) {
      setNotification({
        type: 'error',
        message: '받는 주소와 금액을 모두 입력해주세요.'
      });
      return false;
    }
    if (!validateSolanaAddress(recipientAddress)) {
      setNotification({
        type: 'error',
        message: '유효하지 않은 솔라나 주소입니다.'
      });
      return false;
    }
    if (!isValidAmount(amount)) {
      setNotification({
        type: 'error',
        message: '유효하지 않은 금액입니다.'
      });
      return false;
    }
    return true;
  };

  const handleTransfer = async () => {
    setConfirmDialogOpen(false);
    
    if (!provider || !isAuthenticated || !web3authUser) {
      setNotification({
        type: 'error',
        message: '먼저 지갑에 연결해주세요.'
      });
      return;
    }

    try {
      setLoading(true);

      // Solana 연결 설정
      const rpcUrl = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta'
        ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL!
        : 'https://api.devnet.solana.com';
      
      const connection = new Connection(rpcUrl, 'confirmed');
      const solanaWallet = new SolanaWallet(provider);
      
      // 지갑 주소 가져오기
      const fromAddress = (await solanaWallet.requestAccounts())[0];

      // SOL를 lamports로 변환
      const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;

      // 트랜잭션 생성
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(fromAddress),
          toPubkey: new PublicKey(recipientAddress),
          lamports: Math.floor(lamports)
        })
      );

      // 최근 블록해시 가져오기
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(fromAddress);

      // 트랜잭션 서명 및 전송
      const signature = await solanaWallet.signAndSendTransaction(transaction);

      // 트랜잭션 확인
      const confirmation = await connection.confirmTransaction(signature.signature);
      
      if (confirmation.value.err) {
        throw new Error('트랜잭션이 실패했습니다.');
      }

      // 트랜잭션 기록
      console.log('web3authUser:', web3authUser);
      await fetch('/api/auth/web3auth/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: web3authUser.email,
          txHash: signature.signature,
          txType: 'TRANSFER',
          amount: amount,
          tokenAddress: 'SOL',
          status: 'SUCCESS'
        })
      });

      // Explorer URL 생성
      const explorerUrl = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta'
        ? `https://explorer.solana.com/tx/${signature.signature}`
        : `https://explorer.solana.com/tx/${signature.signature}?cluster=devnet`;

      setNotification({
        type: 'success',
        message: `${amount} SOL이 성공적으로 전송되었습니다. `
          + `트랜잭션 확인하기: ${explorerUrl}`
      });

      // 입력값 초기화
      setRecipientAddress('');
      setAmount('');

    } catch (error) {
      console.error('Transfer error:', error);
      
      // 트랜잭션 실패 기록
      if (web3authUser) {
        await fetch('/api/auth/web3auth/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: web3authUser.email,
            txHash: '',  // 실패한 경우 hash 없음
            txType: 'TRANSFER',
            amount: amount,
            tokenAddress: 'SOL',
            status: 'FAILED'
          })
        });
      }

      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : '전송 중 오류가 발생했습니다.'
      });
    } finally {
      setLoading(false);
    }
  };

  const validateSolanaAddress = (address: string) => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const isValidAmount = (value: string) => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  };

  return (
    <>
      <Box 
        sx={{ 
          maxWidth: 600, 
          mx: 'auto', 
          mt: 4, 
          p: 2 
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              SOL 전송 테스트
            </Typography>

            <Box sx={{ my: 3 }}>
	    D92yLJUg8fz9Hjj3HWJQgo9y9ickKR1Vme8xve93x9D8
              <TextField
                fullWidth
                label="받는 주소"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                error={!!recipientAddress && !validateSolanaAddress(recipientAddress)}
                helperText={
                  recipientAddress && !validateSolanaAddress(recipientAddress)
                    ? '유효하지 않은 솔라나 주소입니다.'
                    : ''
                }
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="금액 (SOL)"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={!!amount && !isValidAmount(amount)}
                helperText={
                  amount && !isValidAmount(amount)
                    ? '0보다 큰 숫자를 입력해주세요.'
                    : ''
                }
                sx={{ mb: 2 }}
              />

              <Button
                variant="contained"
                fullWidth
                onClick={handleTransferClick}
                disabled={
                  loading || 
                  !isAuthenticated || 
                  !validateSolanaAddress(recipientAddress) ||
                  !isValidAmount(amount)
                }
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                ) : null}
                {loading ? '전송 중...' : 'SOL 전송하기'}
              </Button>
            </Box>

            {!isAuthenticated && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                트랜잭션을 보내기 위해서는 먼저 지갑에 연결해주세요.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 확인 다이얼로그 */}
        <Dialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertTriangle color="orange" />
              트랜잭션 확인
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              다음 트랜잭션을 실행하시겠습니까?
            </Typography>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                보내는 금액
              </Typography>
              <Typography variant="h6">
                {amount} SOL
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} gutterBottom>
                받는 주소
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {recipientAddress}
              </Typography>
            </Box>
            <Typography color="error" sx={{ mt: 2 }} variant="body2">
              * 이 트랜잭션은 취소할 수 없습니다.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setConfirmDialogOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button 
              onClick={handleTransfer}
              variant="contained" 
              color="primary"
              disabled={loading}
            >
              {loading ? '처리 중...' : '전송 확인'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 알림 스낵바 */}
        <Snackbar
          open={!!notification}
          autoHideDuration={6000}
          onClose={() => setNotification(null)}
        >
          <Alert
            onClose={() => setNotification(null)}
            severity={notification?.type}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {notification?.message}
          </Alert>
        </Snackbar>
      </Box>
    </>
  );
}