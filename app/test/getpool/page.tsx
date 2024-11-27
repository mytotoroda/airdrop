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
  Grid,
  Paper,
  Tabs,
  Tab
} from '@mui/material';
import { raydiumService } from '@/lib/mmt/raydium';
import { Search, Droplets, Database, Info } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { Connection, PublicKey } from '@solana/web3.js';
import { ApiV3PoolInfoStandardItem } from '@raydium-io/raydium-sdk-v2';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  const theme = useTheme();

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function GetPoolTestPage() {
  const [poolId, setPoolId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const { publicKey } = useWallet();
  const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta';

  const fetchPoolInfo = useCallback(async (poolAddress: string) => {
    try {
      const sdk = await raydiumService.initializeSdk();
      if (!sdk) {
        throw new Error('Failed to initialize Raydium SDK');
      }

      let poolData;
      
      if (isMainnet) {
        const { connection } = sdk;
        const accountInfo = await connection.getAccountInfo(new PublicKey(poolAddress));
        
        if (!accountInfo) {
          throw new Error('Pool not found');
        }

        const poolsData = await sdk.api.fetchPoolById({ ids: poolAddress });
        
        if (!poolsData || poolsData.length === 0) {
          throw new Error('Pool data not found');
        }

        poolData = {
          ...poolsData[0],
          rawInfo: accountInfo,
          network: 'mainnet-beta'
        };
      } else {
        const { connection } = sdk;
        const accountInfo = await connection.getAccountInfo(new PublicKey(poolAddress));
        
        if (!accountInfo) {
          throw new Error('Pool not found');
        }

        poolData = {
          address: poolAddress,
          rawInfo: accountInfo,
          network: 'devnet',
          data: {
            baseDecimal: null,
            baseReserve: null,
            quoteDecimal: null,
            quoteReserve: null,
            lpSupply: null,
            programId: accountInfo.owner.toString(),
            authority: null,
            baseVault: null,
            quoteVault: null,
            lpMint: null,
            openOrders: null,
            targetOrders: null,
            withdrawQueue: null,
            lpVault: null,
            marketId: null,
            marketProgramId: null,
            marketAuthority: null,
            marketBaseVault: null,
            marketQuoteVault: null,
            marketBids: null,
            marketAsks: null,
            marketEventQueue: null,
          }
        };
      }

      return poolData;

    } catch (error) {
      console.error('Pool fetch error:', error);
      throw error;
    }
  }, [isMainnet]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolId.trim()) {
      setError('Pool ID is required');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const info = await fetchPoolInfo(poolId.trim());
      setPoolInfo(info);
      setError(null);
      setTabValue(0); // Reset to overview tab
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pool info');
      setPoolInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => {
    if (!poolInfo) return null;
    
    const overview = {
      "Pool Address": poolId,
      "Network": poolInfo.network,
      "Program ID": poolInfo.rawInfo?.owner.toString(),
      "Space": poolInfo.rawInfo?.space,
      "Balance": `${(poolInfo.rawInfo?.lamports / 1e9).toFixed(9)} SOL`,
    };

    return (
      <Grid container spacing={2}>
        {Object.entries(overview).map(([key, value]) => (
          <Grid item xs={12} sm={6} key={key}>
            <Paper 
              sx={{ 
                p: 2,
                backgroundColor: theme.palette.background.default,
                height: '100%'
              }}
            >
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                {key}
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                {value?.toString() || 'N/A'}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
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
            Raydium Pool Info Test
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
            {isMainnet && (
              <Box sx={{ mt: 1, fontSize: '0.875rem' }}>
                Example SOL-USDC Pool: 58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2
              </Box>
            )}
          </Alert>

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                fullWidth
                label="Pool ID"
                value={poolId}
                onChange={(e) => setPoolId(e.target.value)}
                placeholder="Enter Raydium pool address"
                variant="outlined"
                error={!!error}
                helperText={error}
                disabled={loading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: theme.palette.background.default,
                  }
                }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Search />}
                sx={{ minWidth: 120 }}
              >
                {loading ? 'Loading...' : 'Search'}
              </Button>
            </Box>
          </form>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {poolInfo && (
            <Box>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab 
                    icon={<Info size={16} />} 
                    iconPosition="start" 
                    label="Overview" 
                  />
                  <Tab 
                    icon={<Database size={16} />} 
                    iconPosition="start" 
                    label="Raw Data" 
                  />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                {renderOverview()}
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Paper 
                  sx={{ 
                    p: 2,
                    backgroundColor: theme.palette.background.default,
                  }}
                >
                  <pre 
                    style={{ 
                      overflow: 'auto',
                      margin: 0,
                      color: theme.palette.text.primary,
                      maxHeight: '400px'
                    }}
                  >
                    {JSON.stringify(poolInfo, null, 2)}
                  </pre>
                </Paper>
              </TabPanel>
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}