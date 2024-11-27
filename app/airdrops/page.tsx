'use client'
import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import CampaignList from '@/components/airdrops/CampaignList';
import CampaignCreate from '@/components/airdrops/CampaignCreate';
import CampaignEdit from '@/components/airdrops/CampaignEdit';
import { Campaign } from '@/components/airdrops/types';

export default function AirdropsPage() {
  const { publicKey } = useWallet();
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const renderContent = () => {
    if (!publicKey) {
      return (
        <div className="container mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-4">지갑 연결이 필요합니다</h2>
        </div>
      );
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
  에어드랍 관리
</h1>
          {mode === 'list' && (
            <button
              onClick={() => setMode('create')}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              새 캠페인 만들기
            </button>
          )}
        </div>

        {mode === 'list' && (
          <CampaignList
            onEditClick={(campaign) => {
              setSelectedCampaign(campaign);
              setMode('edit');
            }}
          />
        )}

        {mode === 'create' && (
          <CampaignCreate
            onSuccess={() => {
              setMode('list');
            }}
          />
        )}

        {mode === 'edit' && selectedCampaign && (
          <CampaignEdit
            campaign={selectedCampaign}
            onSuccess={() => {
              setMode('list');
              setSelectedCampaign(null);
            }}
            onCancel={() => {
              setMode('list');
              setSelectedCampaign(null);
            }}
          />
        )}
      </div>
    );
  };

  return renderContent();
}