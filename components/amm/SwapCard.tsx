'use client';

import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Button, 
  TextField, 
  Box, 
  CircularProgress,
  IconButton,
  InputAdornment,
  ThemeProvider,
  CssBaseline
} from '@mui/material';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAMM } from '@/contexts/AMMContext';
import { useWallet } from '@/contexts/WalletContext';
import TokenSelect from './TokenSelect';
import { useAppTheme } from '@/hooks/useAppTheme';

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  balance?: number;
}

export default function SwapCard() {
  const { publicKey } = useWallet();
  const { pools, loading, swap } = useAMM();
  const theme = useAppTheme();
  
  const [inputToken, setInputToken] = useState<Token | null>(null);
  const [outputToken, setOutputToken] = useState<Token | null>(null);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [outputAmount, setOutputAmount] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  // 토큰 쌍 변경
  const handleSwapTokens = () => {
    const tempToken = inputToken;
    const tempAmount = inputAmount;
    setInputToken(outputToken);
    setOutputToken(tempToken);
    setInputAmount(outputAmount);
    setOutputAmount(tempAmount);
  };

  // 예상 아웃풋 계산
  const calculateOutputAmount = async (input: string) => {
    if (!inputToken || !outputToken || !input) {
      setOutputAmount('');
      return;
    }

    try {
      const output = parseFloat(input) * 1; // 임시 1:1 비율
      setOutputAmount(output.toString());
    } catch (error) {
      console.error('Error calculating output:', error);
      setOutputAmount('');
    }
  };

  // 입력값 변경 처리
  const handleInputChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setInputAmount(value);
      calculateOutputAmount(value);
    }
  };

  // 스왑 실행
  const handleSwap = async () => {
    if (!inputToken || !outputToken || !inputAmount || !publicKey) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const pool = pools.find(p => 
        (p.tokenAAddress === inputToken.address && p.tokenBAddress === outputToken.address) ||
        (p.tokenBAddress === inputToken.address && p.tokenAAddress === outputToken.address)
      );

      if (!pool) {
        throw new Error('No liquidity pool found for this token pair');
      }

      await swap(pool.id, inputToken.address, parseFloat(inputAmount));
      setInputAmount('');
      setOutputAmount('');
    } catch (error: any) {
      setError(error.message || '스왑 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const commonTextFieldStyles = {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'background.paper',
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main + '80',
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'primary.main',
      }
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.divider,
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        bgcolor: 'background.default',
        color: 'text.primary',
        p: 3,
        borderRadius: 2,
        boxShadow: 3
      }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600,
              color: 'text.primary'
            }}
          >
            토큰 스왑
          </Typography>
          <IconButton 
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                bgcolor: theme.palette.primary.main + '1A'
              }
            }}
          >
            <SettingsIcon />
          </IconButton>
        </Box>

        {/* Input Token Section */}
        <Box sx={{ mb: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1
          }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              From
            </Typography>
            {inputToken && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                잔액: {inputToken.balance || '0'}
              </Typography>
            )}
          </Box>
          <Box sx={{ 
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            p: 2,
            bgcolor: 'background.paper'
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              gap: 2,
              mb: 1
            }}>
              <TokenSelect
                label="From"
                selectedToken={inputToken}
                onSelect={setInputToken}
              />
              <TextField
                fullWidth
                value={inputAmount}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="0.0"
                sx={commonTextFieldStyles}
                InputProps={{
                  sx: { 
                    typography: 'h6',
                    fontWeight: 500,
                    color: 'text.primary'
                  }
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Swap Button */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          position: 'relative',
          my: 2
        }}>
          <IconButton
            onClick={handleSwapTokens}
            sx={{
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              color: 'primary.main',
              '&:hover': {
                bgcolor: theme.palette.primary.main + '1A'
              }
            }}
          >
            <SwapVertIcon />
          </IconButton>
        </Box>

        {/* Output Token Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1
          }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              To
            </Typography>
            {outputToken && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                잔액: {outputToken.balance || '0'}
              </Typography>
            )}
          </Box>
          <Box sx={{ 
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            p: 2,
            bgcolor: 'background.paper'
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              gap: 2,
              mb: 1
            }}>
              <TokenSelect
                label="To"
                selectedToken={outputToken}
                onSelect={setOutputToken}
              />
              <TextField
                fullWidth
                value={outputAmount}
                placeholder="0.0"
                disabled
                sx={commonTextFieldStyles}
                InputProps={{
                  sx: { 
                    typography: 'h6',
                    fontWeight: 500,
                    color: 'text.primary'
                  }
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Error Message */}
        {error && (
          <Typography 
            color="error" 
            sx={{ 
              mt: 1, 
              mb: 2,
              fontSize: '0.875rem'
            }}
          >
            {error}
          </Typography>
        )}

        {/* Swap Button */}
        <Button
          variant="contained"
          fullWidth
          disabled={!publicKey || !inputToken || !outputToken || !inputAmount || processing}
          onClick={handleSwap}
          sx={{
            height: 56,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 600,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&.Mui-disabled': {
              bgcolor: theme.palette.primary.main + '1A',
              color: 'text.disabled'
            },
            '&:hover': {
              bgcolor: 'primary.dark'
            }
          }}
        >
          {processing ? (
            <CircularProgress size={24} color="inherit" />
          ) : !publicKey ? (
            '지갑 연결 필요'
          ) : !inputToken || !outputToken ? (
            '토큰을 선택하세요'
          ) : !inputAmount ? (
            '금액을 입력하세요'
          ) : (
            '스왑'
          )}
        </Button>
      </Box>
    </ThemeProvider>
  );
}