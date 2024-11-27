// components/mmt/TokenPairSelect.tsx
import React, { useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Autocomplete, 
  Typography, 
  Avatar,
  CircularProgress,
  useTheme,
  Chip
} from '@mui/material';
import { Droplets } from 'lucide-react';
import { useMMT } from '@/contexts/mmt/MMTContext';

// AMMPool 타입은 MMTContext와 공유
interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface AMMPool {
  id: number; // number 타입으로 변경
  poolAddress: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  lastPrice: number;
  priceChangePercent24h: number;
  liquidityUsd: number;
  volume24h: number;
  fee: number;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
}

export default function TokenPairSelect() {
  const theme = useTheme();
  const { 
    pools,
    selectedPool, 
    setSelectedPool,
    refreshPools,
    isLoading: loading 
  } = useMMT();
  const [inputValue, setInputValue] = React.useState('');

  useEffect(() => {
    refreshPools();
  }, []);

  const handlePoolChange = (pool: AMMPool | null) => {
    setSelectedPool(pool);
  };

  const formatNumber = (num: number, digits: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        mb: 2
      }}>
        <Droplets size={20} />
        <Typography variant="h6" component="h2" sx={{ color: 'text.primary' }}>
          Select AMM Pool
        </Typography>
      </Box>

      <Autocomplete
        value={selectedPool}
        onChange={(_, newValue) => handlePoolChange(newValue)}
        inputValue={inputValue}
        onInputChange={(_, newInputValue) => {
          setInputValue(newInputValue);
        }}
        options={pools}
        loading={loading}
        getOptionLabel={(option) => `${option.tokenA.symbol}/${option.tokenB.symbol}`}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search AMM pools..."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'divider'
                },
                '&:hover fieldset': {
                  borderColor: 'primary.main'
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main'
                }
              }
            }}
          />
        )}
        renderOption={(props, pool) => (
          <Box
            component="li"
            {...props}
            sx={{
              '&:hover': {
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : 'rgba(0, 0, 0, 0.02)'
              }
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: 2
            }}>
              {/* Token Pair Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '1 1 auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {pool.tokenA.logoURI && (
                    <Avatar 
                      src={pool.tokenA.logoURI} 
                      alt={pool.tokenA.symbol}
                      sx={{ width: 24, height: 24 }}
                    />
                  )}
                  <Typography variant="body1">
                    {pool.tokenA.symbol}
                  </Typography>
                </Box>
                <Typography color="text.secondary">/</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {pool.tokenB.logoURI && (
                    <Avatar 
                      src={pool.tokenB.logoURI} 
                      alt={pool.tokenB.symbol}
                      sx={{ width: 24, height: 24 }}
                    />
                  )}
                  <Typography variant="body1">
                    {pool.tokenB.symbol}
                  </Typography>
                </Box>
              </Box>

              {/* Pool Statistics */}
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                alignItems: 'center'
              }}>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">
                    ${formatNumber(pool.lastPrice, 6)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: pool.priceChangePercent24h >= 0 
                        ? 'success.main' 
                        : 'error.main'
                    }}
                  >
                    {pool.priceChangePercent24h >= 0 ? '+' : ''}
                    {formatNumber(pool.priceChangePercent24h)}%
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', minWidth: 100 }}>
                  <Typography variant="body2">
                    {formatCurrency(pool.liquidityUsd)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Liquidity
                  </Typography>
                </Box>
                <Chip
                  label={pool.status}
                  size="small"
                  color={
                    pool.status === 'ACTIVE' ? 'success' :
                    pool.status === 'PAUSED' ? 'warning' : 'error'
                  }
                  sx={{ minWidth: 80 }}
                />
              </Box>
            </Box>
          </Box>
        )}
        fullWidth
      />

      {selectedPool && (
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          bgcolor: 'background.paper', 
          borderRadius: 1,
          border: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Pool Details
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Pool Address
              </Typography>
              <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                {selectedPool.poolAddress}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                24h Volume
              </Typography>
              <Typography variant="body1">
                {formatCurrency(selectedPool.volume24h)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Fee Rate
              </Typography>
              <Typography variant="body1">
                {(selectedPool.fee * 100).toFixed(2)}%
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}