//app/amm/page.tsx
'use client';

import { useTheme } from '@mui/material/styles';
import { 
  Box, 
  Paper, 
  Typography, 
  Alert, 
  Container,
  Grid,
} from '@mui/material';
import SwapInterface from '@/components/amm/raydium/SwapInterface';
import { useWallet } from '@/contexts/WalletContext';
import dynamic from 'next/dynamic';
import { AlertCircle } from 'lucide-react';

const PriceChart = dynamic(
  () => import('@/components/mmt/raydium/PriceChart'),
  { 
    ssr: false,
    loading: () => (
      <Box 
        sx={{ 
          width: '100%',
          height: 400,
          bgcolor: 'background.paper',
          borderRadius: 1,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          '@keyframes pulse': {
            '0%, 100%': {
              opacity: 1,
            },
            '50%': {
              opacity: .5,
            },
          },
        }} 
      />
    )
  }
);

export default function AmmPage() {
  const theme = useTheme();
  const { publicKey } = useWallet();
  const isDevnet = process.env.NEXT_PUBLIC_NETWORK !== 'mainnet-beta';

  return (
    <Box 
      sx={{
        minHeight: '100vh',
        bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
        transition: 'background-color 0.3s ease'
      }}
    >
      {/* Network Warning Banner */}
      {isDevnet && (
        <Alert 
          severity="warning" 
          icon={<AlertCircle size={24} />}
          sx={{ 
            borderRadius: 0,
            justifyContent: 'center',
            alignItems: 'center',
            py: 1,
            '& .MuiAlert-icon': {
              color: theme.palette.warning.main
            }
          }}
        >
          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            You are currently connected to Devnet. This is a test environment.
          </Typography>
        </Alert>
      )}

      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 6 } }}>
        {/* Page Header */}
        <Box sx={{ mb: { xs: 4, md: 8 }, textAlign: 'center' }}>
          <Typography 
            variant="h4" 
            component="h1"
            sx={{
              mb: 2,
              fontWeight: 600,
              color: theme.palette.text.primary,
              fontSize: { xs: '1.75rem', md: '2.125rem' }
            }}
          >
            Raydium Swap
          </Typography>
          <Typography 
            variant="body1"
            sx={{
              color: theme.palette.text.secondary,
              maxWidth: '600px',
              mx: 'auto',
              px: 2
            }}
          >
            Swap tokens instantly with the best rates and minimal price impact
          </Typography>
        </Box>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Swap Interface */}
          <Grid item xs={12} lg={7}>
            <Box
              sx={{
                maxWidth: '480px',
                mx: 'auto',
                width: '100%',
                position: 'relative',
                zIndex: 1
              }}
            >
              <SwapInterface />
            </Box>
          </Grid>

          {/* Chart Section */}
          <Grid item xs={12} lg={5}>
            <Paper
              elevation={theme.palette.mode === 'dark' ? 2 : 1}
              sx={{
                height: 400,
                p: 2,
                bgcolor: theme.palette.background.paper,
                display: { xs: 'none', lg: 'block' },
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}
            >
              <Box sx={{ height: '100%' }}>
                <PriceChart />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Mobile Notice */}
        <Box sx={{ display: { xs: 'block', lg: 'none' }, mt: 4 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              textAlign: 'center',
              color: theme.palette.text.secondary 
            }}
          >
            Switch to desktop view to see the price chart
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}