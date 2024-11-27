'use client';

import { useState } from 'react';
import { 
  Box, 
  Container,
  Paper,
  Typography,
  useTheme
} from '@mui/material';
import { useWallet } from '@/contexts/WalletContext';
import { Pool } from '@/types/mmt/pool';
import {
  PoolHeader,
  NetworkWarning,
  PoolList,
  PoolStats,
  NetworkStatus,
  ErrorAlert,
  NewPoolDialog,
  EditPoolDialog,
} from '@/components/mmt/pools';
import { usePoolData } from '@/hooks/mmt/usePoolData';
import { usePoolActions } from '@/hooks/mmt/usePoolActions';
import LoadingOverlay from '@/components/common/LoadingOverlay';

export default function MMTPools() {
  const theme = useTheme();
  const { publicKey, network, connection } = useWallet();
  const { pools, loading, error, setError, fetchPools } = usePoolData();
  const { togglePoolStatus, handleRefresh } = usePoolActions({ fetchPools, setError });
  
  const [isNewPoolOpen, setIsNewPoolOpen] = useState(false);
  const [editPool, setEditPool] = useState<Pool | null>(null);

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        py: 4,
        bgcolor: 'background.default'
      }}
    >
      <Container maxWidth="xl">
        <Paper 
          elevation={0}
          sx={{ 
            p: 3,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider'
          }}
        >
          <PoolHeader 
            onRefresh={handleRefresh}
            onNewPool={() => setIsNewPoolOpen(true)}
            loading={loading}
            isWalletConnected={!!publicKey}
          />

          <NetworkWarning network={network} />

          {error && (
            <ErrorAlert 
              error={error} 
              onClose={() => setError(null)} 
            />
          )}

          {!loading && pools.length === 0 ? (
            <Box 
              sx={{ 
                textAlign: 'center',
                py: 8,
              }}
            >
              <Typography variant="h6" color="text.primary">
                등록된 AMM 풀이 없습니다.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                새로운 AMM 풀을 생성하려면 "새 풀 생성" 버튼을 클릭하세요.
              </Typography>
            </Box>
          ) : (
            <>
              <PoolList 
                pools={pools}
                onToggleStatus={togglePoolStatus}
                onEdit={setEditPool}
                network={network}
              />
              <PoolStats pools={pools} />
            </>
          )}
        </Paper>

        <NetworkStatus network={network} />

        {publicKey && (
          <>
            <NewPoolDialog 
              open={isNewPoolOpen}
              onClose={() => setIsNewPoolOpen(false)}
              onSuccess={() => {
                fetchPools();
                setIsNewPoolOpen(false);
              }}
              walletPublicKey={publicKey}
              connection={connection}
            />
            {editPool && (
              <EditPoolDialog
                open={!!editPool}
                pool={editPool}
                onClose={() => setEditPool(null)}
                onSuccess={() => {
                  fetchPools();
                  setEditPool(null);
                }}
                walletPublicKey={publicKey}
                connection={connection}
              />
            )}
          </>
        )}

        {loading && <LoadingOverlay />}
      </Container>
    </Box>
  );
}