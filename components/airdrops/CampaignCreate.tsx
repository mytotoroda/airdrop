import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CardHeader
} from '@mui/material';

interface CampaignInput {
  title: string;
  token_address: string;
  token_name: string;
  token_symbol: string;
  amount: string;
  total_recipients: number;
  creator_wallet: string;
}

export default function CampaignCreate({
  onSuccess
}: {
  onSuccess: () => void;
}) {
  const { publicKey } = useWallet();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<CampaignInput>({
    title: '',
    token_address: '',
    token_name: '',
    token_symbol: '',
    amount: '',
    total_recipients: 0,
    creator_wallet: publicKey || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }
      
      onSuccess();
    } catch (error) {
      console.error('Failed to create campaign:', error);
      setError(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CampaignInput) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'total_recipients' 
      ? parseInt(e.target.value) || 0
      : e.target.value;
      
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

   return (
    <Card className="max-w-4xl mx-auto mt-4 bg-white dark:bg-gray-800 shadow-md">
      <CardHeader
        title={
          <Typography 
            variant="h5" 
            component="h2"
            className="text-gray-900 dark:text-gray-100"
          >
            Create New Airdrop Campaign
          </Typography>
        }
        className="border-b border-gray-200 dark:border-gray-700"
      />
      <CardContent>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Campaign Title"
                value={formData.title}
                onChange={handleChange('title')}
                required
                variant="outlined"
                placeholder="Enter campaign title"
                className="bg-white dark:bg-gray-900"
                InputLabelProps={{
                  className: "text-gray-600 dark:text-gray-300"
                }}
                InputProps={{
                  className: "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Token Address"
                value={formData.token_address}
                onChange={handleChange('token_address')}
                required
                variant="outlined"
                placeholder="Enter token contract address"
                className="bg-white dark:bg-gray-900"
                InputLabelProps={{
                  className: "text-gray-600 dark:text-gray-300"
                }}
                InputProps={{
                  className: "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Token Name"
                value={formData.token_name}
                onChange={handleChange('token_name')}
                required
                variant="outlined"
                placeholder="e.g. Solana"
                className="bg-white dark:bg-gray-900"
                InputLabelProps={{
                  className: "text-gray-600 dark:text-gray-300"
                }}
                InputProps={{
                  className: "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Token Symbol"
                value={formData.token_symbol}
                onChange={handleChange('token_symbol')}
                required
                variant="outlined"
                placeholder="e.g. SOL"
                className="bg-white dark:bg-gray-900"
                InputLabelProps={{
                  className: "text-gray-600 dark:text-gray-300"
                }}
                InputProps={{
                  className: "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount Per Recipient"
                type="text"
                value={formData.amount}
                onChange={handleChange('amount')}
                required
                variant="outlined"
                placeholder="Enter amount"
                className="bg-white dark:bg-gray-900"
                InputLabelProps={{
                  className: "text-gray-600 dark:text-gray-300"
                }}
                InputProps={{
                  className: "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Total Recipients"
                type="number"
                value={formData.total_recipients}
                onChange={handleChange('total_recipients')}
                required
                variant="outlined"
                inputProps={{ min: 0 }}
                placeholder="Enter number of recipients"
                className="bg-white dark:bg-gray-900"
                InputLabelProps={{
                  className: "text-gray-600 dark:text-gray-300"
                }}
                InputProps={{
                  className: "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                }}
              />
            </Grid>

            {error && (
              <Grid item xs={12}>
                <Alert 
                  severity="error"
                  className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                >
                  {error}
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                className="mt-4 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white disabled:bg-gray-400 dark:disabled:bg-gray-600"
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}