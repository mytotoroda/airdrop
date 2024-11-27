'use client';

import React, { useState, useCallback } from 'react';
import * as web3 from '@solana/web3.js';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  LinearProgress,
  IconButton,
  Card,
  CardContent,
  Tabs,
  Tab,
  SelectChangeEvent,
} from '@mui/material';
import {
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useTheme as useNextTheme } from 'next-themes';

interface GeneratorOptions {
  count: number;
  network: 'mainnet' | 'devnet' | 'testnet';
  format: 'csv' | 'json';
  includePrivateKeys: boolean;
  includeTimestamp: boolean;
}

interface WalletData {
  wallet_address: string;
  amount: number;
  user_id: number;
  privateKey?: string;
  timestamp?: string;
}

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

export default function WalletGeneratorPage() {
  const { theme: themeMode } = useNextTheme();
  
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
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            transition: 'all 0.3s ease-in-out',
          }
        }
      }
    }
  });

  // States
  const [generatorOptions, setGeneratorOptions] = useState<GeneratorOptions>({
    count: 100,
    network: 'devnet',
    format: 'csv',
    includePrivateKeys: false,
    includeTimestamp: false,
  });

  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Handlers
  const handleOptionChange = (field: keyof GeneratorOptions) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent
  ) => {
    setGeneratorOptions(prev => ({
      ...prev,
      [field]: event.target.type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : event.target.value
    }));
  };

  const generateWallets = useCallback(async (): Promise<void> => {
    setIsGenerating(true);
    const newWallets: WalletData[] = [];
    
    try {
      for (let i = 0; i < generatorOptions.count; i++) {
        const keypair = web3.Keypair.generate();
        newWallets.push({
          wallet_address: keypair.publicKey.toString(),
          amount: i + 1,
          user_id: i + 1,
          privateKey: generatorOptions.includePrivateKeys ? 
            Buffer.from(keypair.secretKey).toString('base64') : undefined,
          timestamp: generatorOptions.includeTimestamp ? 
            new Date().toISOString() : undefined
        });
      }
      
      setWallets(newWallets);
      setSnackbar({
        open: true,
        message: `Successfully generated ${generatorOptions.count} wallets`,
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error generating wallets: ' + (error as Error).message,
        severity: 'error'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [generatorOptions]);

  const downloadWallets = (): void => {
    let content = '';
    
    if (generatorOptions.format === 'csv') {
      const headers = ['wallet_address', 'amount', 'user_id'];
      if (generatorOptions.includePrivateKeys) headers.push('private_key');
      if (generatorOptions.includeTimestamp) headers.push('timestamp');
      
      content = headers.join(',') + '\n';
      
      wallets.forEach(wallet => {
        const row = [
          wallet.wallet_address,
          wallet.amount,
          wallet.user_id,
          generatorOptions.includePrivateKeys ? wallet.privateKey : '',
          generatorOptions.includeTimestamp ? wallet.timestamp : ''
        ].filter(Boolean);
        content += row.join(',') + '\n';
      });
    } else {
      const jsonWallets = wallets.map(wallet => ({
        wallet_address: wallet.wallet_address,
        amount: wallet.amount,
        user_id: wallet.user_id,
        ...(generatorOptions.includePrivateKeys && { private_key: wallet.privateKey }),
        ...(generatorOptions.includeTimestamp && { timestamp: wallet.timestamp })
      }));
      content = JSON.stringify(jsonWallets, null, 2);
    }

    const blob = new Blob([content], { 
      type: generatorOptions.format === 'csv' ? 'text/csv' : 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `solana_wallets_${new Date().getTime()}.${generatorOptions.format}`;
    link.click();
  };

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbar({
        open: true,
        message: 'Copied to clipboard!',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to copy to clipboard',
        severity: 'error'
      });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{
        bgcolor: theme.palette.background.default,
        minHeight: '100vh',
        transition: 'background-color 0.3s ease-in-out'
      }}>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper elevation={0} sx={{
            p: 4,
            borderRadius: 2,
            mb: 4,
            boxShadow: theme.shadows[6]
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
              <Typography variant="h4" gutterBottom fontWeight={600} color="primary">
                Solana Wallet Generator
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="Number of Wallets"
                  value={generatorOptions.count}
                  onChange={handleOptionChange('count')}
                  InputProps={{ inputProps: { min: 1, max: 10000 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Network</InputLabel>
                  <Select
                    value={generatorOptions.network}
                    label="Network"
                    onChange={handleOptionChange('network')}
                  >
                    <MenuItem value="mainnet">Mainnet</MenuItem>
                    <MenuItem value="devnet">Devnet</MenuItem>
                    <MenuItem value="testnet">Testnet</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Output Format</InputLabel>
                  <Select
                    value={generatorOptions.format}
                    label="Output Format"
                    onChange={handleOptionChange('format')}
                  >
                    <MenuItem value="csv">CSV</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={generateWallets}
                  disabled={isGenerating}
                  startIcon={<RefreshIcon />}
                  sx={{ height: '56px' }}
                >
                  Generate Wallets
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Additional Options
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={generatorOptions.includePrivateKeys}
                        onChange={handleOptionChange('includePrivateKeys')}
                      />
                    }
                    label="Include Private Keys"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={generatorOptions.includeTimestamp}
                        onChange={handleOptionChange('includeTimestamp')}
                      />
                    }
                    label="Include Timestamp"
                  />
                </Grid>
              </Grid>
            </Box>
          </Paper>

          {isGenerating && (
            <Box sx={{ width: '100%', mb: 4 }}>
              <LinearProgress />
            </Box>
          )}

          {wallets.length > 0 && (
            <Paper elevation={0} sx={{
              p: 4,
              borderRadius: 2,
              boxShadow: theme.shadows[6]
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3 
              }}>
                <Typography variant="h6" gutterBottom>
                  Generated Wallets ({wallets.length})
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<CopyIcon />}
                    onClick={() => copyToClipboard(
                      JSON.stringify(wallets, null, 2)
                    )}
                    sx={{ mr: 2 }}
                  >
                    Copy All
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={downloadWallets}
                  >
                    Download
                  </Button>
                </Box>
              </Box>

              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{ mb: 2 }}
              >
                <Tab label="Preview" />
                <Tab label="Raw Data" />
              </Tabs>

              {activeTab === 0 && (
                <Box sx={{ 
                  maxHeight: '400px',
                  overflow: 'auto',
                  '& pre': {
                    margin: 0,
                    padding: 2,
                    borderRadius: 1,
                    bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'
                  }
                }}>
                  {wallets.slice(0, 5).map((wallet, index) => (
                    <Card key={index} sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="primary">
                          User #{wallet.user_id}
                        </Typography>
                        <Box sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          mt: 1,
                          flexDirection: 'column',
                          alignItems: 'flex-start'
                        }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
                            Wallet: {wallet.wallet_address}
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            Amount: {wallet.amount}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(wallet.wallet_address)}
                            sx={{ ml: 1 }}
                          >
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                  {wallets.length > 5 && (
                    <Alert severity="info">
                      Showing first 5 wallets. Download or copy all to see the complete list.
                    </Alert>
                  )}
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ 
                  maxHeight: '400px',
                  overflow: 'auto'
                }}>
                  <pre style={{
                    margin: 0,
                    padding: theme.spacing(2),
                    borderRadius: theme.shape.borderRadius,
                    backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(wallets, null, 2)}
                  </pre>
                </Box>
              )}
            </Paper>
          )}

          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          >
            <Alert
              onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
              severity={snackbar.severity}
              variant="filled"
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}