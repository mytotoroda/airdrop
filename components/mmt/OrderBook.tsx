import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper,
  Chip,
  Skeleton,
  useTheme,
  alpha,
  Tooltip,
  IconButton
} from '@mui/material';
import { Droplets, TrendingUp, HelpCircle } from 'lucide-react';
import { useMMT } from '@/contexts/mmt/MMTContext';
import { formatNumber, formatCurrency } from '@/utils/mmt/formatters';

interface PriceImpact {
  amount: number;
  priceImpact: number;
  outputAmount: number;
  effectivePrice: number;
}

interface PoolState {
  tokenAReserve: number;
  tokenBReserve: number;
  tokenASymbol: string;
  tokenBSymbol: string;
  currentPrice: number;
  fee: number;
  liquidityUSD: number;
  volume24h: number;
}

interface LiquidityBookProps {
  tokenPair: string;
}

const LiquidityBook: React.FC<LiquidityBookProps> = ({ tokenPair }) => {
  const theme = useTheme();
  const { selectedPool } = useMMT();
  const [poolState, setPoolState] = useState<PoolState | null>(null);
  const [buyImpacts, setBuyImpacts] = useState<PriceImpact[]>([]);
  const [sellImpacts, setSellImpacts] = useState<PriceImpact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPool?.id) {
      fetchPoolState();
      const interval = setInterval(fetchPoolState, 100000); // 100초마다 업데이트
      return () => clearInterval(interval);
    }
  }, [selectedPool]);

  const fetchPoolState = async () => {
    if (!selectedPool?.id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/mmt/pool-state/${selectedPool.pool_id}`);

      
      if (!response.ok) {
        throw new Error('Failed to fetch pool state');
      }

      const data = await response.json();
      if (data.poolState) {
        setPoolState(data.poolState);
        calculatePriceImpacts(data.poolState);
      }
    } catch (error) {
      console.error('Failed to fetch pool state:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePriceImpacts = (pool: PoolState) => {
    const tradeAmounts = [1000, 5000, 10000, 50000, 100000]; // USD 기준 거래량
    const buyImpacts: PriceImpact[] = [];
    const sellImpacts: PriceImpact[] = [];

    tradeAmounts.forEach(amount => {
      // Buy impact calculation
      const buyInput = amount / pool.currentPrice;
      const buyOutput = calculateOutputAmount(
        buyInput,
        pool.tokenBReserve,
        pool.tokenAReserve,
        pool.fee
      );
      const buyPrice = amount / buyOutput;
      const buyImpact = ((buyPrice - pool.currentPrice) / pool.currentPrice) * 100;

      buyImpacts.push({
        amount,
        priceImpact: buyImpact,
        outputAmount: buyOutput,
        effectivePrice: buyPrice
      });

      // Sell impact calculation
      const sellInput = amount / pool.currentPrice;
      const sellOutput = calculateOutputAmount(
        sellInput,
        pool.tokenAReserve,
        pool.tokenBReserve,
        pool.fee
      );
      const sellPrice = sellOutput / sellInput;
      const sellImpact = ((pool.currentPrice - sellPrice) / pool.currentPrice) * 100;

      sellImpacts.push({
        amount,
        priceImpact: sellImpact,
        outputAmount: sellOutput,
        effectivePrice: sellPrice
      });
    });

    setBuyImpacts(buyImpacts);
    setSellImpacts(sellImpacts);
  };

  const calculateOutputAmount = (
    inputAmount: number,
    inputReserve: number,
    outputReserve: number,
    fee: number
  ): number => {
    const inputWithFee = inputAmount * (1 - fee);
    return (outputReserve * inputWithFee) / (inputReserve + inputWithFee);
  };

  if (loading || !poolState) {
    return (
      <Box sx={{ 
        p: 2,
        height: '100%',
        bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default'
      }}>
        <Skeleton variant="text" width="60%" height={40} />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, my: 3 }}>
          <Skeleton variant="rectangular" height={80} />
          <Skeleton variant="rectangular" height={80} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          <Skeleton variant="rectangular" height={300} />
          <Skeleton variant="rectangular" height={300} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'background.paper',
      p: 3,
      borderRadius: 1
    }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Droplets 
            size={20} 
            color={theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main} 
          />
          <Typography variant="h6" component="h2" sx={{ color: 'text.primary' }}>
            Liquidity Book
          </Typography>
        </Box>
        <Tooltip title="Shows estimated price impact for different trade sizes based on current pool liquidity">
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            <HelpCircle size={16} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Pool Stats */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 2,
        mb: 3
      }}>
        <Paper sx={{ 
          p: 2, 
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
          borderRadius: 1,
          boxShadow: theme.palette.mode === 'dark' ? 1 : 2
        }}>
          <Typography variant="subtitle2" color="text.secondary">
            Pool Liquidity
          </Typography>
          <Typography variant="h6" color="text.primary">
            {formatCurrency(poolState.liquidityUSD)}
          </Typography>
        </Paper>
        <Paper sx={{ 
          p: 2, 
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
          borderRadius: 1,
          boxShadow: theme.palette.mode === 'dark' ? 1 : 2
        }}>
          <Typography variant="subtitle2" color="text.secondary">
            24h Volume
          </Typography>
          <Typography variant="h6" color="text.primary">
            {formatCurrency(poolState.volume24h)}
          </Typography>
        </Paper>
      </Box>

      {/* Price Impact Tables */}
      <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {/* Buy Side */}
        <TableContainer component={Paper} sx={{ 
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
          borderRadius: 1,
          boxShadow: theme.palette.mode === 'dark' ? 1 : 2
        }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="subtitle2" sx={{ 
                    color: theme.palette.success.main,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <TrendingUp size={16} />
                    Buy {poolState.tokenASymbol}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Size (USD)</TableCell>
                <TableCell align="right">Est. Price</TableCell>
                <TableCell align="right">Impact</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {buyImpacts.map((impact, index) => (
                <TableRow key={index} hover>
                  <TableCell>{formatCurrency(impact.amount)}</TableCell>
                  <TableCell align="right">{formatNumber(impact.effectivePrice)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${impact.priceImpact.toFixed(2)}%`}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.error.main, Math.min(impact.priceImpact / 20, 1)),
                        color: impact.priceImpact > 3 ? 'white' : 'text.primary',
                        fontWeight: 500
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Sell Side */}
        <TableContainer component={Paper} sx={{ 
          bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : 'background.default',
          borderRadius: 1,
          boxShadow: theme.palette.mode === 'dark' ? 1 : 2
        }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography variant="subtitle2" sx={{ 
                    color: theme.palette.error.main,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <TrendingUp size={16} />
                    Sell {poolState.tokenASymbol}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Size (USD)</TableCell>
                <TableCell align="right">Est. Price</TableCell>
                <TableCell align="right">Impact</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sellImpacts.map((impact, index) => (
                <TableRow key={index} hover>
                  <TableCell>{formatCurrency(impact.amount)}</TableCell>
                  <TableCell align="right">{formatNumber(impact.effectivePrice)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${impact.priceImpact.toFixed(2)}%`}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.error.main, Math.min(impact.priceImpact / 20, 1)),
                        color: impact.priceImpact > 3 ? 'white' : 'text.primary',
                        fontWeight: 500
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Box>
  );
};

export default LiquidityBook;