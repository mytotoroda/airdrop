import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Skeleton
} from '@mui/material';
import { Campaign } from '@/types/campaign';

interface CampaignInfoProps {
  campaignId: string;
}

export default function CampaignInfo({ campaignId }: CampaignInfoProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaignDetails();
  }, [campaignId]);

  const fetchCampaignDetails = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      const data = await response.json();
      setCampaign(data);
    } catch (error) {
      console.error('Failed to fetch campaign details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Skeleton 
        variant="rectangular" 
        height={200} 
        className="bg-gray-200 dark:bg-gray-700"
      />
    );
  }

  if (!campaign) {
    return (
      <Typography 
        color="error" 
        className="text-red-600 dark:text-red-400"
      >
        캠페인 정보를 불러올 수 없습니다.
      </Typography>
    );
  }

  return (
    <Box className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography 
              variant="h5" 
              component="h1"
              className="text-gray-900 dark:text-gray-100 font-semibold"
            >
              {campaign.title}
            </Typography>
            <Chip 
              label={campaign.status} 
              color={campaign.status === 'COMPLETED' ? 'success' : 'primary'}
              className={`${
                campaign.status === 'COMPLETED'
                  ? 'bg-green-500 dark:bg-green-600'
                  : 'bg-blue-500 dark:bg-blue-600'
              } text-white`}
            />
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography 
            variant="subtitle2" 
            className="text-gray-600 dark:text-gray-400 mb-1"
          >
            토큰 정보
          </Typography>
          <Typography 
            variant="body1"
            className="text-gray-900 dark:text-gray-100"
          >
            {campaign.token_name} ({campaign.token_symbol})
          </Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography 
            variant="subtitle2" 
            className="text-gray-600 dark:text-gray-400 mb-1"
          >
            총 수량
          </Typography>
          <Typography 
            variant="body1"
            className="text-gray-900 dark:text-gray-100"
          >
            {campaign.amount} {campaign.token_symbol}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Box className="mt-4">
            <Box display="flex" justifyContent="space-between" className="mb-2">
              <Typography 
                variant="body2"
                className="text-gray-600 dark:text-gray-400"
              >
                진행률: {campaign.completed_recipients}/{campaign.total_recipients}
              </Typography>
              <Typography 
                variant="body2"
                className="text-gray-600 dark:text-gray-400"
              >
                {Math.round((campaign.completed_recipients / campaign.total_recipients) * 100)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={(campaign.completed_recipients / campaign.total_recipients) * 100}
              className="h-2 rounded bg-gray-200 dark:bg-gray-700"
              sx={{
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'rgb(59, 130, 246)', // blue-600
                  '.dark &': {
                    backgroundColor: 'rgb(96, 165, 250)', // blue-400
                  }
                }
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}