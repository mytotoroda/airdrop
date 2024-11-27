//ts
'use client';

import React, { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { Connection } from '@solana/web3.js';
import { TokenAmount, Liquidity, LiquidityPoolKeys } from '@raydium-io/raydium-sdk';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  SwapHoriz as SwapIcon,
  AddCircleOutline as AddIcon,
  RemoveCircleOutline as RemoveIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme, Theme } from '@mui/material/styles';
import { useTheme as useNextTheme } from 'next-themes';

interface TokenInfo {
  symbol: string;
  address: string;
}

interface PoolData {
  tvl: number;
  volume24h: number;
  fee24h: number;
  apr: number;
}

interface AmountState {
  sol: string;
  token: string;
}

export default function LiquidityPage() {
  const { publicKey, connectWallet, disconnectWallet } = useWallet();
  const { theme: themeMode } = useNextTheme();

  // 테마 설정
  const theme = createTheme({
    palette: {
      mode: themeMode === 'dark' ? 'dark' : 'light',
      primary: {
        main: themeMode === 'dark' ? '#90caf9' : '#1976d2'
      },
      background: {
        default: themeMode === 'dark' ? '#121212' : '#f5f5f5',
        paper: themeMode === 'dark' ? '#1e1e1e' : '#ffffff'
      }
    }
  });

  // 상태 관리
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [amounts, setAmounts] = useState<AmountState>({
    sol: '',
    token: ''
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 임시 토큰 리스트
  const tokenList: TokenInfo[] = [
    { symbol: 'BONK', address: '...' },
    { symbol: 'WEN', address: '...' },
  ];

  // 임시 풀 데이터
  const poolData: PoolData = {
    tvl: 1000000,
    volume24h: 500000,
    fee24h: 1500,
    apr: 25.5
  };

  // 핸들러 함수들
  const handleTokenSelect = (event: SelectChangeEvent<string>) => {
    setSelectedToken(event.target.value);
  };

  const handleAmountChange = (field: keyof AmountState) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAmounts(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleAddLiquidity = async (): Promise<void> => {
    if (!publicKey) {
      alert('지갑을 먼저 연결해주세요');
      return;
    }

    setIsLoading(true);
    try {
      // Raydium SDK를 사용한 유동성 공급 로직이 들어갈 자리
      console.log('Adding liquidity:', amounts);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 임시 딜레이
      alert('유동성 공급이 완료되었습니다');
    } catch (error) {
      console.error('Error:', error);
      alert('유동성 공급 중 오류가 발생했습니다');
    }
    setIsLoading(false);
  };

  // JSX 부분은 이전과 동일하므로 생략...
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
        bgcolor: theme.palette.background.default,
        minHeight: '100vh',
        py: 4
      }}>
        <Container maxWidth="lg">
          {/* 지갑 연결 버튼 */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
            <Button
              variant={publicKey ? "outlined" : "contained"}
              onClick={publicKey ? disconnectWallet : connectWallet}
              startIcon={<WalletIcon />}
            >
              {publicKey ? 
                `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}` : 
                '지갑 연결'}
            </Button>
          </Box>

          {/* 풀 정보 카드 */}
          <Paper elevation={0} sx={{ p: 4, mb: 4, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom color="primary">
              유동성 풀 정보
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      총 예치금액 (TVL)
                    </Typography>
                    <Typography variant="h6">
                      ${poolData.tvl.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      24시간 거래량
                    </Typography>
                    <Typography variant="h6">
                      ${poolData.volume24h.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      24시간 수수료
                    </Typography>
                    <Typography variant="h6">
                      ${poolData.fee24h.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      예상 APR
                    </Typography>
                    <Typography variant="h6">
                      {poolData.apr}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          {/* 유동성 공급 폼 */}
          <Paper elevation={0} sx={{ p: 4, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom color="primary">
              유동성 공급
            </Typography>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>토큰 선택</InputLabel>
                <Select
                  value={selectedToken}
                  label="토큰 선택"
                  onChange={handleTokenSelect}
                >
                  {tokenList.map((token) => (
                    <MenuItem key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="SOL 수량"
                    type="number"
                    value={amounts.sol}
                    onChange={handleAmountChange('sol')}
                    InputProps={{
                      endAdornment: <Typography>SOL</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="토큰 수량"
                    type="number"
                    value={amounts.token}
                    onChange={handleAmountChange('token')}
                    InputProps={{
                      endAdornment: selectedToken && 
                        <Typography>{selectedToken}</Typography>
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleAddLiquidity}
              disabled={isLoading || !selectedToken || !amounts.sol || !amounts.token}
              startIcon={isLoading ? <CircularProgress size={24} /> : <AddIcon />}
              sx={{ height: '48px' }}
            >
              {isLoading ? '처리중...' : '유동성 공급'}
            </Button>

            {!publicKey && (
              <Alert severity="info" sx={{ mt: 2 }}>
                유동성 공급을 위해 지갑을 연결해주세요
              </Alert>
            )}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}