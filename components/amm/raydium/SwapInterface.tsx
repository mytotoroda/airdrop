//components/amm/raydium/swapinterface.tsx
'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Card,
  CardContent,
  TextField,
  Button,
  IconButton,
  Typography,
  Box,
  useTheme,
  CircularProgress,
  Alert,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { ArrowDownUp, Settings, Info } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { SwapService, swapService } from '@/lib/amm/services/swapService';
import { TokenInfo } from '@/types/amm/pool';
import { formatNumber } from '@/utils/mmt/formatters';

const SLIPPAGE_OPTIONS = [0.1, 0.5, 1, 3];

export default function SwapCard() {
  const theme = useTheme();
  const { publicKey, connectWallet } = useWallet();
  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);
  const [amountIn, setAmountIn] = useState<string>('');
  const [amountOut, setAmountOut] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const supportedTokens = useMemo(() => swapService.getSupportedTokens(), []);

  const handleAmountInChange = useCallback(async (value: string) => {
    setAmountIn(value);
    if (!tokenA || !tokenB || !value || isNaN(Number(value))) {
      setAmountOut('');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const quote = await swapService.getSwapQuote({
        tokenIn: tokenA,
        tokenOut: tokenB,
        amountIn: value,
        slippage: slippage / 100,
        wallet: publicKey || undefined
      });
      setAmountOut(quote.amountOut);
    } catch (err) {
      console.error('Quote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get quote');
      setAmountOut('');
    } finally {
      setLoading(false);
    }
  }, [tokenA, tokenB, slippage, publicKey]);



/////////////////


const handleSwap = async () => {
  if (!publicKey) {
    await connectWallet();
    return;
  }

  try {
    setLoading(true);
    setError(null);

    const quote = await swapService.getSwapQuote({
      tokenIn: tokenA,
      tokenOut: tokenB,
      amountIn,
      slippage: slippage / 100,
      wallet: publicKey
    });

    await swapService.executeSwap({
      tokenIn: tokenA,
      tokenOut: tokenB,
      amountIn,
      slippage: slippage / 100,
      wallet: publicKey
    }, quote);

    // 성공 처리
  } catch (err) {
    console.error('Swap error:', err);
    setError(err instanceof Error ? err.message : 'Swap failed');
  } finally {
    setLoading(false);
  }
};

////////////////////////////////////////

  const switchTokens = () => {
    setTokenA(tokenB);
    setTokenB(tokenA);
    setAmountIn(amountOut);
    setAmountOut('');
  };

  return (
    <Card sx={{
      maxWidth: 480,
      mx: 'auto',
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[3],
      borderRadius: 2,
    }}>
      <CardContent>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Swap Tokens
          </Typography>
          <IconButton onClick={() => setShowSettings(!showSettings)}>
            <Settings size={20} />
          </IconButton>
        </Box>

        {showSettings && (
          <Box sx={{ mb: 3, p: 2, bgcolor: theme.palette.background.default, borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Slippage Tolerance
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {SLIPPAGE_OPTIONS.map((value) => (
                <Button
                  key={value}
                  variant={slippage === value ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSlippage(value)}
                  sx={{ minWidth: 48 }}
                >
                  {value}%
                </Button>
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ mb: 2 }}>
          <TextField
            select
            fullWidth
            label="You Pay"
            value={tokenA?.symbol || ''}
            onChange={(e) => {
              const token = supportedTokens.find(t => t.symbol === e.target.value);
              setTokenA(token || null);
            }}
            sx={{ mb: 1 }}
          >
            {supportedTokens.map((token) => (
              <MenuItem key={token.address} value={token.symbol}>
                {token.symbol}
              </MenuItem>
            ))}
          </TextField>
          
          <TextField
            fullWidth
            type="number"
            value={amountIn}
            onChange={(e) => handleAmountInChange(e.target.value)}
            InputProps={{
              endAdornment: tokenA && (
                <InputAdornment position="end">
                  {tokenA.symbol}
                </InputAdornment>
              )
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <IconButton onClick={switchTokens} size="small">
            <ArrowDownUp size={20} />
          </IconButton>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            select
            fullWidth
            label="You Receive"
            value={tokenB?.symbol || ''}
            onChange={(e) => {
              const token = supportedTokens.find(t => t.symbol === e.target.value);
              setTokenB(token || null);
            }}
            sx={{ mb: 1 }}
          >
            {supportedTokens.map((token) => (
              <MenuItem key={token.address} value={token.symbol}>
                {token.symbol}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            value={amountOut}
            disabled
            InputProps={{
              endAdornment: tokenB && (
                <InputAdornment position="end">
                  {tokenB.symbol}
                </InputAdornment>
              )
            }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={loading || !tokenA || !tokenB || !amountIn || !amountOut}
          onClick={handleSwap}
          sx={{
            height: 48,
            background: theme.palette.primary.main,
            '&:hover': {
              background: theme.palette.primary.dark,
            }
          }}
        >
          {loading ? (
            <CircularProgress size={24} color="inherit" />
          ) : !publicKey ? (
            'Connect Wallet'
          ) : (
            'Swap'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}