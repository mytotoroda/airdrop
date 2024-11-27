// pages/mmt/test/page.tsx
'use client'
import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper,
  Divider,
  Alert,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TokenSelector from '@/components/mmt/raydium/TokenSelector';
import { TokenInfo } from '@/types/mmt/pool';

export default function TokenTestPage() {
  const theme = useTheme();
  const [tokenA, setTokenA] = useState<TokenInfo | null>(null);
  const [tokenB, setTokenB] = useState<TokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTokenASelect = (token: TokenInfo) => {
    setError(null);
    if (tokenB && token.address === tokenB.address) {
      setError("Cannot select the same token");
      return;
    }
    setTokenA(token);
  };

  const handleTokenBSelect = (token: TokenInfo) => {
    setError(null);
    if (tokenA && token.address === tokenA.address) {
      setError("Cannot select the same token");
      return;
    }
    setTokenB(token);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper
        sx={{
          p: 4,
          bgcolor: theme.palette.background.paper,
          borderRadius: 2,
          boxShadow: theme.shadows[3],
        }}
      >
        <Typography variant="h5" gutterBottom>
          Token Selector Test
        </Typography>
        
        <Divider sx={{ my: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', mb: 4 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Token A
            </Typography>
            <TokenSelector
              onSelect={handleTokenASelect}
              selectedToken={tokenA || undefined}
              otherToken={tokenB || undefined}
            />
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Token B
            </Typography>
            <TokenSelector
              onSelect={handleTokenBSelect}
              selectedToken={tokenB || undefined}
              otherToken={tokenA || undefined}
            />
          </Box>
        </Box>

        {/* 선택된 토큰 정보 표시 */}
        {(tokenA || tokenB) && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Selected Tokens Info
            </Typography>
            
            {tokenA && (
              <Paper 
                sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.02)' 
                }}
              >
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  Token A Details:
                </Typography>
                <Typography>Symbol: {tokenA.symbol}</Typography>
                <Typography>Name: {tokenA.name}</Typography>
                <Typography>Address: {tokenA.address}</Typography>
                <Typography>Decimals: {tokenA.decimals}</Typography>
              </Paper>
            )}
            
            {tokenB && (
              <Paper 
                sx={{ 
                  p: 2,
                  bgcolor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.02)' 
                }}
              >
                <Typography variant="subtitle1" color="primary" gutterBottom>
                  Token B Details:
                </Typography>
                <Typography>Symbol: {tokenB.symbol}</Typography>
                <Typography>Name: {tokenB.name}</Typography>
                <Typography>Address: {tokenB.address}</Typography>
                <Typography>Decimals: {tokenB.decimals}</Typography>
              </Paper>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
}