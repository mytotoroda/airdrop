// app/mmt/pools/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { MMController } from '@/components/MarketMaker/MMController';

import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  useTheme,
  Alert,
  CircularProgress,
  Tooltip,
  Divider,
  Dialog,                // 추가
  DialogTitle,           // 추가
  DialogContent,         // 추가
  DialogActions          // 추가
} from '@mui/material';
import { 
  Plus, 
  Pencil, 
  Play, 
  Pause, 
  RefreshCw, 
  Droplets,
  ExternalLink,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  Liquidity,
  LiquidityPoolKeys,
  LiquidityStateLayout,
  LIQUIDITY_STATE_LAYOUT_V4
} from '@raydium-io/raydium-sdk';
import NewPoolDialog from '@/components/mmt/pools/NewPoolDialog';
import EditPoolDialog from '@/components/mmt/pools/EditPoolDialog';
import { useWallet } from '@/contexts/WalletContext';
import { Pool, RaydiumPoolInfo } from '@/types/mmt/pool';
import { 
  verifyRaydiumPool,
  calculatePoolPrice 
} from '@/utils/mmt/raydium';  // 경로 확인

// Raydium 관련 상수
const MAINNET_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
const DEVNET_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

export default function MMTPools() {
  const theme = useTheme();
  const { publicKey, network, connection } = useWallet();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewPoolOpen, setIsNewPoolOpen] = useState(false);
  const [editPool, setEditPool] = useState<Pool | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // 강제 새로고침을 위한 키

  // Raydium 프로그램 ID 설정
  const RAYDIUM_PROGRAM_ID = network === 'mainnet-beta' ? MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID;


///////////////////////////////////////////////
 useEffect(() => {
  fetchPools();
  
  // 풀 목록 자동 새로고침 (5분마다)
  const poolsInterval = setInterval(fetchPools, 300000);

  // MM 상태 업데이트 간격 (15초마다)
  const statusInterval = setInterval(() => {
    pools.forEach(pool => {
      if (pool.enabled) {
        fetch(`/api/mmt/status/${pool.id}`)
          .then(res => res.json())
          .then(data => {
            setPools(currentPools => 
              currentPools.map(p => 
                p.id === pool.id ? { ...p, mmStatus: data.isActive } : p
              )
            );
          })
          .catch(console.error);
      }
    });
  }, 15000);

  return () => {
    clearInterval(poolsInterval);
    clearInterval(statusInterval);
  };
}, [network, connection, refreshKey]);
///////////////////////////////////////////////////

  const fetchRaydiumPoolInfo = async (poolAddress: string): Promise<RaydiumPoolInfo | null> => {
    try {
      const poolPublicKey = new PublicKey(poolAddress);
      const poolInfo = await connection.getAccountInfo(poolPublicKey);
      
      if (!poolInfo) {
        return null;
      }

      const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(poolInfo.data);

      return {
        baseDecimals: poolState.baseDecimals,
        quoteDecimals: poolState.quoteDecimals,
        lpDecimals: poolState.lpDecimals,
        baseReserve: poolState.baseReserve.toNumber(),
        quoteReserve: poolState.quoteReserve.toNumber(),
        lpSupply: poolState.lpSupply.toNumber(),
        startTime: poolState.startTime.toNumber(),
        programId: RAYDIUM_PROGRAM_ID.toString(),
        ammId: poolState.ammId.toString(),
        status: poolState.status ? 'ACTIVE' : 'INACTIVE'
      };
    } catch (error) {
      console.error('Error fetching Raydium pool info:', error);
      return null;
    }
  };


///////////////////////////////////


const fetchPools = async () => {
  try {
    setError(null);
    setLoading(true);

    const response = await fetch('/api/mmt/pools');
    if (!response.ok) {
      throw new Error('Failed to fetch pools');
    }
    
    const { success, pools: fetchedPools } = await response.json();
    
    if (!success || !Array.isArray(fetchedPools)) {
      throw new Error('Invalid response format');
    }

    // RPC 연결 설정
    const network = process.env.NEXT_PUBLIC_NETWORK || 'devnet';
    const rpcUrl = network === 'mainnet-beta'
      ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL
      : 'https://api.devnet.solana.com';
    const solanaConnection = new Connection(rpcUrl);

    // Raydium 풀 정보 및 MM 상태 가져오기
    const poolsWithFullInfo = await Promise.all(
      fetchedPools.map(async (pool) => {
        if (!pool || !pool.poolAddress) {
          console.log('Invalid pool data:', pool);
          return pool;
        }
        
        try {
          // Raydium 풀 정보 가져오기
          const raydiumPool = await verifyRaydiumPool(pool.poolAddress, solanaConnection);
          
          // MM 상태 가져오기
          const mmStatusResponse = await fetch(`/api/mmt/status/${pool.id}`);
          const mmStatus = await mmStatusResponse.json();

          if (raydiumPool) {
            const currentPrice = calculatePoolPrice(
              raydiumPool.baseReserve,
              raydiumPool.quoteReserve,
              raydiumPool.baseDecimals,
              raydiumPool.quoteDecimals
            );
            
            return {
              ...pool,
              raydiumPool,
              lastPrice: currentPrice || 0,
              mmStatus: mmStatus.isActive
            };
          }

          return {
            ...pool,
            lastPrice: 0,
            mmStatus: mmStatus.isActive,
            raydiumPool: {
              baseDecimals: 9,
              quoteDecimals: 9,
              lpDecimals: 9,
              baseReserve: 0,
              quoteReserve: 0,
              lpSupply: 0,
              status: 'ACTIVE'
            }
          };
        } catch (error) {
          console.error(`Error fetching info for pool ${pool.poolAddress}:`, error);
          return pool;
        }
      })
    );

    console.log('Processed pools:', poolsWithFullInfo);
    setPools(poolsWithFullInfo);
    
  } catch (error) {
    console.error('Failed to fetch pools:', error);
    setError('풀 데이터를 불러오는데 실패했습니다.');
  } finally {
    setLoading(false);
  }
};
/////////////////////////////////////////

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey(prev => prev + 1);
  };

  const togglePoolStatus = async (poolId: number, currentEnabled: boolean) => {
  if (!publicKey) {
    setError('지갑이 연결되어 있지 않습니다.');
    return;
  }

  try {
    const response = await fetch(`/api/mmt/pools/toggle/${poolId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        enabled: !currentEnabled,
        network: process.env.NEXT_PUBLIC_NETWORK 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update pool status');
    }

    const result = await response.json();
    if (result.success) {
      await fetchPools(); // 풀 목록 새로고침
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error toggling pool status:', error);
    setError(error instanceof Error ? error.message : 'Failed to toggle pool status');
  }
};

  const formatNumber = (num: number, options: { 
    minimumFractionDigits?: number,
    maximumFractionDigits?: number,
    compact?: boolean
  } = {}) => {
    const { 
      minimumFractionDigits = 2,
      maximumFractionDigits = 6,
      compact = false
    } = options;

    if (compact) {
      if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`;
      } else if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`;
      }
    }

    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return {
          //color: theme.palette.success.main,
          color: "white",
          bgColor: theme.palette.success.dark,
          label: '활성'
        };
      case 'PAUSED':
        return {
          color: theme.palette.warning.main,
          bgColor: theme.palette.warning.light,
          label: '일시중지'
        };
      case 'INACTIVE':
        return {
          color: theme.palette.error.main,
          bgColor: theme.palette.error.light,
          label: '비활성'
        };
      default:
        return {
          color: theme.palette.grey[500],
          bgColor: theme.palette.grey[200],
          label: '알 수 없음'
        };
    }
  };

  const getExplorerUrl = (address: string) => {
    const baseUrl = network === 'mainnet-beta' 
      ? 'https://solscan.io'
      : 'https://solscan.io/address';
    return `${baseUrl}/${address}`;
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        height: '400px'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Droplets size={28} />
          <Typography variant="h4">풀 관리</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={18} />}
            onClick={handleRefresh}
            disabled={loading}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={18} />}
            onClick={() => setIsNewPoolOpen(true)}
            disabled={!publicKey}
          >
            새 풀 생성
          </Button>
        </Box>
      </Box>

      {/* Network Warning */}
      {network === 'mainnet-beta' && (
        <Alert 
          severity="warning" 
          icon={<AlertTriangle size={24} />}
          sx={{ mb: 3 }}
        >
          메인넷에 연결되어 있습니다. 실제 자산이 사용됩니다.
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert 
          severity="error"
          onClose={() => setError(null)}
          sx={{ mb: 3 }}
        >
          {error}
        </Alert>
      )}

      {/* No Data Message */}
      {!loading && pools.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Box sx={{ mb: 2 }}>
            <Info size={48} color={theme.palette.text.secondary} />
          </Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            등록된 풀이 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary">
            새로운 풀을 생성하여 마켓메이킹을 시작하세요.
          </Typography>
        </Paper>
      )}

      {/* Pools Table */}
      {pools.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>풀 주소</TableCell>
                <TableCell>토큰 페어</TableCell>
                <TableCell align="right">현재가</TableCell>
                <TableCell align="right">24시간 거래량</TableCell>
                <TableCell align="right">유동성</TableCell>
                <TableCell align="center">상태</TableCell>
                <TableCell align="center">MM 활성화</TableCell>
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pools.map((pool) => {
                const statusConfig = getStatusColor(pool.status);
                return (
                  <TableRow key={pool.id}>
                    <TableCell>
  <Box sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: 1,
    fontFamily: 'monospace'
  }}>
    {pool.poolAddress ? (
      <>
        {`${pool.poolAddress.slice(0, 4)}...${pool.poolAddress.slice(-4)}`}
        <Tooltip title="Explorer에서 보기">
          <IconButton 
            size="small"
            onClick={() => window.open(getExplorerUrl(pool.poolAddress), '_blank')}
          >
            <ExternalLink size={14} />
          </IconButton>
        </Tooltip>
      </>
    ) : (
      '주소 없음'
    )}
  </Box>
</TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {`${pool.tokenA.symbol}/${pool.tokenB.symbol}`}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      ${formatNumber(pool.lastPrice, { 
                        maximumFractionDigits: 8 
                      })}
                    </TableCell>

                    <TableCell align="right">
                      ${formatNumber(pool.volume24h, { 
                        maximumFractionDigits: 2,
                        compact: true
                      })}
                    </TableCell>

                    <TableCell align="right">
                      ${formatNumber(pool.liquidityUsd, { 
                        maximumFractionDigits: 2,
                        compact: true
                      })}
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        label={statusConfig.label}
                        size="small"
                        sx={{
                          bgcolor: statusConfig.bgColor,
                          color: statusConfig.color,
                          fontWeight: 500
                        }}
                      />
                    </TableCell>






                    <TableCell align="center">
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
    <Chip
      label={pool.enabled ? "활성" : "비활성"}
      size="small"
      sx={{
        bgcolor: pool.enabled 
          ? theme.palette.success.light 
          : theme.palette.grey[200],
        color: pool.enabled 
          ? theme.palette.success.dark 
          : theme.palette.grey[700],
        fontWeight: 500
      }}
    />
    {pool.enabled && pool.mmStatus && (
      <Tooltip title="MM 실행 중">
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'success.main',
            animation: 'pulse 2s infinite'
          }}
        />
      </Tooltip>
    )}
  </Box>
</TableCell>





                    <TableCell align="center">
  <Box sx={{ 
    display: 'flex', 
    justifyContent: 'center', 
    gap: 1 
  }}>
    <Tooltip title="설정 수정">
      <IconButton 
        size="small"
        onClick={() => setEditPool(pool)}
      >
        <Pencil size={18} />
      </IconButton>
    </Tooltip>

    <Tooltip title={pool.enabled ? "MM 비활성화" : "MM 활성화"}>
      <IconButton 
        size="small"
        onClick={() => togglePoolStatus(pool.id, pool.enabled)}
        color={pool.enabled ? "error" : "success"}
      >
        {pool.enabled ? <Pause size={18} /> : <Play size={18} />}
      </IconButton>
    </Tooltip>
    
    {/* MM Controller 추가 */}
    {pool.enabled && (
      <MMController
        poolId={pool.id.toString()}
        enabled={pool.enabled}
        interval={15000}
        onError={(error) => {
          console.error('MM Error:', error);
          setError('Market making error occurred');
        }}
      />
    )}
  </Box>
</TableCell>
                  </TableRow>
                );
              })}

            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialogs */}
      <NewPoolDialog 
        open={isNewPoolOpen}
        onClose={() => setIsNewPoolOpen(false)}
        onSuccess={() => {
          fetchPools();
          setIsNewPoolOpen(false);
        }}
        walletPublicKey={publicKey}
        connection={connection}
        raydiumProgramId={RAYDIUM_PROGRAM_ID}
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
          raydiumProgramId={RAYDIUM_PROGRAM_ID}
        />
      )}

      {/* Mobile Pool Actions Menu */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          p: 2,
          display: { sm: 'none' },
          zIndex: 1000,
        }}
      >
        <Button
          fullWidth
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={() => setIsNewPoolOpen(true)}
          disabled={!publicKey}
        >
          새 풀 생성
        </Button>
      </Box>

      {/* Network Status */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          gap: 1,
          bgcolor: 'background.paper',
          p: 1,
          px: 2,
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: network === 'mainnet-beta' ? 'success.main' : 'warning.main',
          }}
        />
        <Typography variant="caption" color="text.secondary">
          {network === 'mainnet-beta' ? 'Mainnet' : 'Devnet'}
        </Typography>
      </Box>

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
          }}
        >
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              minWidth: 200,
            }}
          >
            <CircularProgress size={24} />
            <Typography>풀 정보 불러오는 중...</Typography>
          </Paper>
        </Box>
      )}

      {/* Error Snackbar */}
      {error && (
        <Box
          sx={{
            position: 'fixed',
            bottom: { xs: 80, sm: 16 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1100,
          }}
        >
          <Alert 
            severity="error"
            onClose={() => setError(null)}
            sx={{
              minWidth: 300,
              boxShadow: 3,
            }}
          >
            {error}
          </Alert>
        </Box>
      )}

      {/* Pool Stats Summary */}
      {pools.length > 0 && (
        <Paper 
          sx={{ 
            mt: 3, 
            p: 2,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 3,
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              총 풀 수
            </Typography>
            <Typography variant="h6">
              {pools.length}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              활성 풀
            </Typography>
            <Typography variant="h6" color="success.main">
              {pools.filter(p => p.status === 'ACTIVE').length}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              총 유동성
            </Typography>
            <Typography variant="h6">
              ${formatNumber(
                pools.reduce((sum, p) => sum + p.liquidityUsd, 0),
                { maximumFractionDigits: 2, compact: true }
              )}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              24시간 거래량
            </Typography>
            <Typography variant="h6">
              ${formatNumber(
                pools.reduce((sum, p) => sum + p.volume24h, 0),
                { maximumFractionDigits: 2, compact: true }
              )}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Network Warning Modal */}
      {network === 'mainnet-beta' && !localStorage.getItem('mainnetWarningDismissed') && (
        <Dialog
          open={true}
          onClose={() => localStorage.setItem('mainnetWarningDismissed', 'true')}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertTriangle color={theme.palette.warning.main} />
              메인넷 경고
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography>
              현재 메인넷에 연결되어 있습니다. 모든 트랜잭션에 실제 SOL이 사용됩니다.
              신중하게 진행해주세요.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => localStorage.setItem('mainnetWarningDismissed', 'true')}
              color="primary"
            >
              확인
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}