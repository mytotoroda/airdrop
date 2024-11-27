import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useTheme } from '@mui/material/styles';
import { useTheme as useNextTheme } from 'next-themes';
import {
  Container,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Copy,
  ExternalLink,
  Plus,
  RefreshCw,
  Wallet as WalletIcon,
  AlertTriangle,
  Check,
  XCircle
} from 'lucide-react';

const WalletManagementPage = () => {
  const { wallet, publicKey, network } = useWallet();
  const theme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';
  
  const [wallets, setWallets] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 지갑 목록 불러오기
  useEffect(() => {
    fetchWallets();
  }, [publicKey]);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mmt/wallets');
      const data = await response.json();
      if (data.success) {
        setWallets(data.wallets);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('지갑 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async () => {
    if (!wallet || !publicKey) {
      setError('지갑이 연결되어 있지 않습니다.');
      return;
    }

    try {
      const response = await fetch('/api/mmt/wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newWalletName,
          address: publicKey,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await fetchWallets();
        setIsAddDialogOpen(false);
        setNewWalletName('');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('지갑 추가에 실패했습니다.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Grid container justifyContent="space-between" alignItems="center">
          <Grid item>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                color: isDark ? 'grey.100' : 'grey.900',
                fontWeight: 'bold'
              }}
            >
              지갑 관리
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<Plus size={20} />}
              onClick={() => setIsAddDialogOpen(true)}
              sx={{
                bgcolor: isDark ? 'primary.dark' : 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: isDark ? 'primary.main' : 'primary.dark',
                }
              }}
            >
              새 지갑 추가
            </Button>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {wallets.map((wallet) => (
          <Grid item xs={12} md={6} lg={4} key={wallet.address}>
            <Card
              elevation={isDark ? 2 : 1}
              sx={{
                bgcolor: isDark ? 'grey.800' : 'background.paper',
                '&:hover': {
                  boxShadow: theme.shadows[isDark ? 4 : 2],
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <WalletIcon size={24} />
                  <Typography
                    variant="h6"
                    sx={{
                      ml: 1,
                      color: isDark ? 'grey.100' : 'grey.900'
                    }}
                  >
                    {wallet.name}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: isDark ? 'grey.400' : 'grey.600',
                      mr: 1
                    }}
                  >
                    {`${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}`}
                  </Typography>
                  <Tooltip title="주소 복사">
                    <IconButton
                      size="small"
                      onClick={() => copyToClipboard(wallet.address)}
                      sx={{ color: isDark ? 'grey.400' : 'grey.600' }}
                    >
                      <Copy size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Explorer에서 보기">
                    <IconButton
                      size="small"
                      onClick={() => window.open(
                        `https://explorer.solana.com/address/${wallet.address}?cluster=${network}`,
                        '_blank'
                      )}
                      sx={{ color: isDark ? 'grey.400' : 'grey.600' }}
                    >
                      <ExternalLink size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: isDark ? 'grey.400' : 'grey.600' }}
                  >
                    상태: {wallet.status === 'active' ? (
                      <Box component="span" sx={{ color: 'success.main' }}>
                        활성
                      </Box>
                    ) : (
                      <Box component="span" sx={{ color: 'error.main' }}>
                        비활성
                      </Box>
                    )}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: isDark ? 'grey.400' : 'grey.600', mt: 1 }}
                  >
                    마지막 활동: {new Date(wallet.lastActivity).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog 
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: isDark ? 'grey.800' : 'background.paper',
          }
        }}
      >
        <DialogTitle sx={{ color: isDark ? 'grey.100' : 'grey.900' }}>
          새 지갑 추가
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="지갑 이름"
            fullWidth
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            sx={{
              '& .MuiInputLabel-root': {
                color: isDark ? 'grey.400' : 'grey.600',
              },
              '& .MuiInputBase-input': {
                color: isDark ? 'grey.100' : 'grey.900',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: isDark ? 'grey.700' : 'grey.300',
                },
                '&:hover fieldset': {
                  borderColor: isDark ? 'grey.600' : 'grey.400',
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)} sx={{ color: isDark ? 'grey.400' : 'grey.600' }}>
            취소
          </Button>
          <Button onClick={handleAddWallet} variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WalletManagementPage;