'use client'
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Paper, Tab, Tabs, Box } from '@mui/material';
import CampaignInfo from '@/components/airdrop-detail/CampaignInfo';
import AirdropExecution from '@/components/airdrop-detail/AirdropExecution';
import RecipientManagement from '@/components/airdrop-detail/RecipientManagement';
import CreateAta from '@/components/airdrop-detail/CreateAta';

export default function AirdropDetailPage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('camp_id');
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  if (!campaignId) {
    return (
      <div className="text-red-600 dark:text-red-400 text-center py-8">
        Invalid campaign ID
      </div>
    );
  }

  return (
    <Container maxWidth="lg" className="py-8">
      <Paper className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
        <div className="p-6">
          <CampaignInfo campaignId={campaignId} />
          
          <Box className="mt-8 border-b border-gray-200 dark:border-gray-700">
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange}
              className="text-gray-900 dark:text-gray-100"
              TabIndicatorProps={{
                className: "bg-blue-500 dark:bg-blue-400"
              }}
              sx={{
                '& .MuiTab-root': {
                  color: 'rgb(107, 114, 128)',
                  '&.Mui-selected': {
                    color: 'rgb(59, 130, 246)',
                  },
                  '.dark &': {
                    color: 'rgb(156, 163, 175)',
                    '&.Mui-selected': {
                      color: 'rgb(96, 165, 250)',
                    }
                  }
                }
              }}
            >
              <Tab 
                label="에어드랍 실행" 
                className="font-medium"
              />
              <Tab 
                label="대상자 관리" 
                className="font-medium"
              />
              <Tab 
                label="ATA 생성" 
                className="font-medium"
              />
            </Tabs>
          </Box>
          
          {currentTab === 0 && (
            <Box className="py-6">
              <AirdropExecution campaignId={campaignId} />
            </Box>
          )}
          
          {currentTab === 1 && (
            <Box className="py-6">
              <RecipientManagement campaignId={campaignId} />
            </Box>
          )}

          {currentTab === 2 && (
            <Box className="py-6">
              <CreateAta campaignId={campaignId} />
            </Box>
          )}
        </div>
      </Paper>
    </Container>
  );
}