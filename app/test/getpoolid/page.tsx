'use client';

import React, { useState, useCallback } from 'react';
import { 
  Container, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress,
  Alert,
  Box,
  useTheme,
  Paper,
  Divider,
  Grid,
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  Search, 
  Droplets, 
  ArrowDownUp, 
  Copy, 
  ExternalLink 
} from 'lucide-react';
import { raydiumService } from '@/lib/mmt/raydium';
import { useWallet } from '@/contexts/WalletContext';
import { PublicKey } from '@solana/web3.js';

// 예제 토큰 주소들
const EXAMPLE_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  SAMO: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
} as const;

interface Pool {
  id: string;
  type: string;
  category: string;
  tokenA: {
    symbol: string;
    name: string;
    address: string;
  };
  tokenB: {
    symbol: string;
    name: string;
    address: string;
  };
  price: string;
  tvl: string;
  volume24h: string;
  fee24h: string;
  apr7d: string;
  feeApr7d: string;
  rewardApr7d: string;
  programId: string;
  feeRate: string;
}

export default function GetPoolIdTestPage() {
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [copied, setCopied] = useState<string>('');
  const theme = useTheme();
  const { publicKey } = useWallet();
  const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta';

  // 토큰 주소 유효성 검사
  const isValidTokenAddress = (address: string) => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const handleSwapInputs = () => {
    setTokenA(tokenB);
    setTokenB(tokenA);
  };

  const handleLoadExample = (exampleType: string) => {
    switch(exampleType) {
      case 'SOL-USDC':
        setTokenA(EXAMPLE_TOKENS.SOL);
        setTokenB(EXAMPLE_TOKENS.USDC);
        break;
      case 'BONK-SOL':
        setTokenA(EXAMPLE_TOKENS.BONK);
        setTokenB(EXAMPLE_TOKENS.SOL);
        break;
      case 'SAMO-USDC':
        setTokenA(EXAMPLE_TOKENS.SAMO);
        setTokenB(EXAMPLE_TOKENS.USDC);
        break;
    }
  };

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const findPools = useCallback(async () => {
    if (!tokenA.trim() || !tokenB.trim()) {
      setError('Both token addresses are required');
      return;
    }

    if (!isValidTokenAddress(tokenA) || !isValidTokenAddress(tokenB)) {
      setError('Invalid token address format. Please check the addresses.');
      return;
    }

    setLoading(true);
    setError(null);
    setPools([]);

    try {
      const allPools = await raydiumService.findAllPools(tokenA.trim(), tokenB.trim());
      
      // Combine all pools
      const combinedPools = [
        ...allPools.standard,
        ...allPools.concentrated
      ];

      setPools(combinedPools);

      if (combinedPools.length === 0) {
        setError('No pools found for these tokens');
      }
    } catch (err) {
      console.error('Error finding pools:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pool information');
      setPools([]);
    } finally {
      setLoading(false);
    }
  }, [tokenA, tokenB]);

  const openExplorerUrl = (address: string) => {
    const baseUrl = isMainnet 
      ? 'https://solscan.io/account/'
      : 'https://solscan.io/account/';
    window.open(`${baseUrl}${address}`, '_blank');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card 
        elevation={0}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          mb: 3
        }}
      >
        <CardContent>
          <Typography 
            variant="h5" 
            component="h1" 
            gutterBottom
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              color: theme.palette.text.primary 
            }}
          >
            <Droplets size={24} />
            Find Raydium Pool ID
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Box>
              Network: {process.env.NEXT_PUBLIC_NETWORK}
              {publicKey && (
                <Box component="span" sx={{ ml: 2 }}>
                  | Wallet: {publicKey}
                </Box>
              )}
            </Box>
          </Alert>

          {isMainnet && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Load Examples:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => handleLoadExample('SOL-USDC')}
                >
                  SOL-USDC
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => handleLoadExample('BONK-SOL')}
                >
                  BONK-SOL
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => handleLoadExample('SAMO-USDC')}
                >
                  SAMO-USDC
                </Button>
              </Box>
            </Box>
          )}

          <Box sx={{ mb: 4 }}>
            <TextField
              fullWidth
              label="Token A Address"
              value={tokenA}
              onChange={(e) => setTokenA(e.target.value)}
              placeholder="Enter first token address"
              variant="outlined"
              error={!!error && !isValidTokenAddress(tokenA)}
              helperText={(!isValidTokenAddress(tokenA) && tokenA) ? 'Invalid token address' : ''}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.default,
                }
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
              <Button
                onClick={handleSwapInputs}
                sx={{ minWidth: 'auto', p: 1 }}
              >
                <ArrowDownUp size={20} />
              </Button>
            </Box>

            <TextField
              fullWidth
              label="Token B Address"
              value={tokenB}
              onChange={(e) => setTokenB(e.target.value)}
              placeholder="Enter second token address"
              variant="outlined"
              error={!!error && !isValidTokenAddress(tokenB)}
              helperText={(!isValidTokenAddress(tokenB) && tokenB) ? 'Invalid token address' : ''}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.default,
                }
              }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={findPools}
              disabled={loading || !tokenA || !tokenB}
              startIcon={loading ? <CircularProgress size={20} /> : <Search />}
            >
              {loading ? 'Searching...' : 'Find Pools'}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {pools.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Found Pools ({pools.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {pools.map((pool) => (
                  <Paper
                    key={pool.id}
                    sx={{
                      p: 2,
                      backgroundColor: theme.palette.background.default
                    }}
                  >
                    {/* Pool ID Section */}
                    <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Pool ID
                      </Typography>
                      <Tooltip title={copied === 'pool' ? 'Copied!' : 'Copy Pool ID'}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopy(pool.id, 'pool')}
                        >
                          <Copy size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View on Explorer">
                        <IconButton 
                          size="small" 
                          onClick={() => openExplorerUrl(pool.id)}
                        >
                          <ExternalLink size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', mb: 2 }}>
                      {pool.id}
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    {/* Pool Details */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Pool Type
                        </Typography>
                        <Typography variant="body2">
                          {pool.category}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Pair
                        </Typography>
                        <Typography variant="body2">
                          {pool.tokenA.symbol}/{pool.tokenB.symbol}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Price
                        </Typography>
                        <Typography variant="body2">
                          {pool.price}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">
                          TVL
                        </Typography>
                        <Typography variant="body2">
                          {pool.tvl}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">
                          24h Volume
                        </Typography>
                        <Typography variant="body2">
                          {pool.volume24h}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">
                          24h Fees
                        </Typography>
                        <Typography variant="body2">
                          {pool.fee24h}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">
                          Fee Rate
                        </Typography>
                        <Typography variant="body2">
                          {pool.feeRate}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="textSecondary">
                          7d APR
                        </Typography>
                        <Typography variant="body2">
                          {pool.apr7d}
                        </Typography>
                      </Grid>
                      {pool.rewardApr7d && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="textSecondary">
                            Reward APR (7d)
                          </Typography>
                          <Typography variant="body2">
                            {pool.rewardApr7d}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}

          {pools.length === 0 && !loading && !error && (
            <Alert severity="info">
              Enter token addresses and click "Find Pools" to search for available liquidity pools.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}