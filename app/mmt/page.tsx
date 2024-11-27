'use client'
import { Metadata } from 'next';
import Dashboard from '@/components/mmt/Dashboard';
import { useWallet } from '@/contexts/WalletContext';
import { Box, Button, Typography, useTheme } from '@mui/material';


export default function MMTPage() {
  const { publicKey, connectWallet } = useWallet();
  const theme = useTheme();

  if (!publicKey) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          bgcolor: theme.palette.background.default,
          color: theme.palette.text.primary
        }}
      >
        <Typography variant="h5" component="h1" gutterBottom>
          Please connect your wallet to use the Market Making Tool
        </Typography>
        <Button 
          variant="contained" 
          onClick={connectWallet}
          sx={{ mt: 2 }}
        >
          Connect Wallet
        </Button>
      </Box>
    );
  }

  return <Dashboard />;
}