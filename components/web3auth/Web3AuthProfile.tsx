'use client';

import { useState, useCallback } from 'react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import { 
  Card, 
  CardContent, 
  Avatar, 
  Typography, 
  Button, 
  Chip, 
  Stack, 
  Box,
  Snackbar,
  Alert
} from '@mui/material';
import { 
  LogOut, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  Droplets
} from 'lucide-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  balance: number;
  onBalanceUpdate?: () => void;
}

interface NotificationType {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function Web3AuthProfile({ balance, onBalanceUpdate }: Props) {
  const { user, disconnect } = useWeb3Auth();
  const [copied, setCopied] = useState(false);
  const [isAirdropLoading, setIsAirdropLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);

  if (!user) return null;

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setNotification({
        type: 'success',
        message: '지갑 주소가 클립보드에 복사되었습니다.'
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setNotification({
        type: 'error',
        message: '클립보드 복사에 실패했습니다.'
      });
    }
  };

  const handleRequestAirdrop = async () => {
    if (!user.wallet) return;

    try {
      setIsAirdropLoading(true);
      const connection = new Connection(
        'https://api.devnet.solana.com',
        'confirmed'
      );

      const signature = await connection.requestAirdrop(
        new PublicKey(user.wallet),
        LAMPORTS_PER_SOL
      );

      await connection.confirmTransaction(signature);
      onBalanceUpdate?.();
      setNotification({
        type: 'success',
        message: '1 SOL이 지갑으로 전송되었습니다!'
      });
    } catch (error) {
      setNotification({
        type: 'error',
        message: '에어드랍 요청에 실패했습니다. 다시 시도해주세요.'
      });
    } finally {
      setIsAirdropLoading(false);
    }
  };

  return (
    <>
      <Card sx={{ 
        maxWidth: 400,
        bgcolor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3
      }}>
        <CardContent>
          <Stack spacing={2}>
            {/* 프로필 헤더 */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={user.profileImage}
                alt={user.name}
                sx={{ width: 60, height: 60 }}
              />
              <Box flex={1}>
                <Typography variant="h6" component="div">
                  {user.name}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {user.email}
                </Typography>
              </Box>
            </Stack>

            {/* 지갑 정보 */}
            <Box bgcolor="background.default" p={2} borderRadius={1}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Wallet Address
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                  {user.wallet}
                </Typography>
                <Button
                  size="small"
                  onClick={() => copyToClipboard(user.wallet)}
                  startIcon={copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </Stack>
            </Box>

            {/* SOL 잔액 with 애니메이션 */}
            <Box bgcolor="background.default" p={2} borderRadius={1}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                SOL Balance
              </Typography>
              <motion.div
                key={balance}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Typography variant="h6">
                  {balance.toFixed(4)} SOL
                </Typography>
              </motion.div>
            </Box>

            {/* 연결 상태 */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label="Connected"
                color="success"
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                via Web3Auth
              </Typography>
            </Stack>

            {/* 작업 버튼들 */}
            <Stack direction="column" spacing={1}>
              {process.env.NEXT_PUBLIC_NETWORK !== 'mainnet-beta' && (
                <Button
                  variant="outlined"
                  onClick={handleRequestAirdrop}
                  startIcon={<Droplets size={16} />}
                  disabled={isAirdropLoading}
                  fullWidth
                >
                  {isAirdropLoading ? 'Requesting...' : 'Request 1 SOL (Devnet)'}
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<ExternalLink size={16} />}
                href={`https://explorer.solana.com/address/${user.wallet}${
                  process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta' ? '' : '?cluster=devnet'
                }`}
                target="_blank"
                rel="noopener noreferrer"
                fullWidth
              >
                View on Explorer
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<LogOut size={16} />}
                onClick={disconnect}
                fullWidth
              >
                Disconnect
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 알림 스낵바 */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification?.type || 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </>
  );
}