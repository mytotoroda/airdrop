import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Campaign } from './types';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Box,
  Skeleton,
  Stack
} from '@mui/material';
import {
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  PlayArrow as PlayArrowIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

interface CampaignListProps {
  onEditClick: (campaign: Campaign) => void;
}

const StatusChip = ({ status }: { status: Campaign['status'] }) => {
  const { theme } = useTheme();
  
  const getStatusConfig = (status: Campaign['status']) => {
    switch (status) {
      case 'COMPLETED':
        return { 
          label: '완료됨', 
          color: 'success' as const, 
          icon: <CheckCircleIcon sx={{ width: 16, height: 16 }} />
        };
      case 'FAILED':
        return { 
          label: '실패', 
          color: 'error' as const, 
          icon: <ErrorIcon sx={{ width: 16, height: 16 }} />
        };
      case 'IN_PROGRESS':
        return { 
          label: '진행중', 
          color: 'info' as const, 
          icon: <PlayArrowIcon sx={{ width: 16, height: 16 }} />
        };
      default:
        return { 
          label: '대기중', 
          color: 'default' as const, 
          icon: <PendingIcon sx={{ width: 16, height: 16 }} />
        };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      size="small"
      sx={{ 
        '& .MuiChip-icon': { 
          marginLeft: '8px',
        }
      }}
    />
  );
};

export default function CampaignList({ onEditClick }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/campaigns');
      const data = await response.json();
      
      const campaignsList = data.data || data;
      if (Array.isArray(campaignsList)) {
        setCampaigns(campaignsList);
      } else {
        console.error('Unexpected data format:', data);
        setCampaigns([]);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (campaignId: string) => {
    router.push(`/airdrop-detail?camp_id=${campaignId}`);
  };

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Card className="bg-white dark:bg-gray-800">
              <CardContent>
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="rectangular" height={20} sx={{ mt: 2 }} />
              </CardContent>
              <CardActions>
                <Skeleton variant="rectangular" width={80} height={36} />
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (campaigns.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight={300}
        textAlign="center"
        className="text-gray-600 dark:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600 rounded p-6"
      >
        <Typography variant="h6" gutterBottom>
          아직 생성된 캠페인이 없습니다
        </Typography>
        <Typography variant="body2">
          새 캠페인 만들기 버튼을 클릭하여 첫 캠페인을 생성해보세요!
        </Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {campaigns.map((campaign) => (
        <Grid item xs={12} sm={6} md={4} key={campaign.id}>
          <Card 
            className="h-full flex flex-col bg-white dark:bg-gray-800 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <CardContent className="flex-grow">
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography 
                  variant="h6" 
                  component="h3" 
                  className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100"
                >
                  {campaign.title}
                </Typography>
                <StatusChip status={campaign.status} />
              </Box>

              <Typography 
                variant="body2" 
                className="text-gray-600 dark:text-gray-300 mb-2"
              >
                Token: {campaign.token_name} ({campaign.token_symbol})
              </Typography>
              
              <Typography 
                variant="body2" 
                className="text-gray-600 dark:text-gray-300 mb-2"
              >
                Amount: {campaign.amount}
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography 
                    variant="body2" 
                    className="text-gray-600 dark:text-gray-300"
                  >
                    Recipients: {campaign.completed_recipients}/{campaign.total_recipients}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    className="text-gray-600 dark:text-gray-300"
                  >
                    {Math.round((campaign.completed_recipients / campaign.total_recipients) * 100)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(campaign.completed_recipients / campaign.total_recipients) * 100}
                  className="h-1.5 rounded"
                />
              </Box>
            </CardContent>

            <CardActions className="p-4 pt-0">
              <Stack direction="row" spacing={1} width="100%">
                <Button
                  variant="outlined"
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleViewDetails(campaign.id)}
                  className="flex-1 normal-case text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  상세보기
                </Button>
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => onEditClick(campaign)}
                  className="flex-1 normal-case bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  수정
                </Button>
              </Stack>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}