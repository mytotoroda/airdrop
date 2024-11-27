// components/mmt/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography,
  Container,
  useMediaQuery,
  Alert,
  Snackbar,
  IconButton,
  CircularProgress,
  Fade
} from '@mui/material';
import { X as CloseIcon } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useAppTheme } from '@/hooks/useAppTheme';
import { MMTProvider, useMMT } from '@/contexts/mmt/MMTContext';

// 1. TokenPairSelect - 최상단 풀 선택
import TokenPairSelect from './TokenPairSelect';
// 2. AlertPanel - 알림 패널
import AlertPanel from './AlertPanel';
// 3. TradingChart - 차트 영역 (왼쪽)
import TradingChart from './TradingChart';
// 4. MarketStats - 시장 통계 (오른쪽)
import MarketStats from './MarketStats';
// 5. OrderBook - 주문북 (오른쪽)
import OrderBook from './OrderBook';
// 6. PositionTable - 포지션 테이블 (하단)
import PositionTable from './PositionTable';

interface DashboardAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  autoHide?: boolean;
}

// 로깅 유틸리티
const logStep = (step: string, data?: any) => {
  console.log('\n--------------------');
  console.log(`[Dashboard] ${step}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('--------------------\n');
};

function DashboardContent() {
  const theme = useAppTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { publicKey, network } = useWallet();
  const { selectedPool, error: mmtError, isLoading, pools } = useMMT();
  
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // 지갑 연결 상태 감지
  useEffect(() => {
    const walletAlert: DashboardAlert = {
      id: 'wallet-connect',
      type: 'warning',
      message: '거래를 시작하려면 지갑을 연결하세요',
      autoHide: false
    };

    //logStep('Wallet connection check', { connected: !!publicKey });
    if (!publicKey) {
      setAlerts(prev => {
        if (!prev.find(alert => alert.id === walletAlert.id)) {
          return [...prev, walletAlert];
        }
        return prev;
      });
    } else {
      setAlerts(prev => prev.filter(alert => alert.id !== walletAlert.id));
    }
  }, [publicKey]);

  // MMT 에러 감지
  useEffect(() => {
    if (mmtError) {
      //logStep('MMT error detected', { error: mmtError });
      setAlerts(prev => [
        ...prev,
        {
          id: `mmt-error-${Date.now()}`,
          type: 'error',
          message: mmtError,
          autoHide: true
        }
      ]);
    }
  }, [mmtError]);

  // 자동 숨김 알림 처리
  useEffect(() => {
    const autoHideAlerts = alerts.filter(alert => alert.autoHide);
    if (autoHideAlerts.length > 0) {
      //logStep('Setting up auto-hide alerts', { count: autoHideAlerts.length });
      const timers = autoHideAlerts.map(alert => 
        setTimeout(() => {
          handleDismissAlert(alert.id);
        }, 5000)
      );

      return () => {
        timers.forEach(timer => clearTimeout(timer));
      };
    }
  }, [alerts]);

  // 알림 제거 핸들러
  const handleDismissAlert = (alertId: string) => {
    //logStep('Dismissing alert', { alertId });
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // 스낵바 닫기 핸들러
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // 초기 로딩 상태 표시
  if (isLoading && !selectedPool && pools.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: 2,
          py: 8 
        }}>
          <CircularProgress />
          <Typography color="text.secondary">
            풀 정보를 불러오는 중...
          </Typography>
        </Box>
      </Container>
    );
  }

  // 풀 목록이 비어있는 경우
  if (!isLoading && pools.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="info">
          사용 가능한 AMM 풀이 없습니다.
        </Alert>
      </Container>
    );
  }

  return (
    <Fade in timeout={300}>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Network Banner */}
          {network === 'mainnet-beta' && (
            <Paper 
              elevation={0}
              sx={{
                p: 2,
                bgcolor: theme.palette.mode === 'dark' 
                  ? 'error.dark'
                  : 'error.light',
                borderColor: theme.palette.mode === 'dark'
                  ? 'error.dark'
                  : 'error.light',
              }}
            >
              <Typography 
                variant="subtitle2" 
                color="dark"
                align="center"
                sx={{ fontWeight: 'medium' }}
              >
                메인넷에 연결되었습니다. 실제 자금이 사용됩니다.
              </Typography>
            </Paper>
          )}

          {/* Alert Panel */}
          {alerts.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  severity={alert.type}
                  onClose={() => handleDismissAlert(alert.id)}
                  sx={{
                    '& .MuiAlert-message': {
                      flex: 1
                    }
                  }}
                >
                  {alert.message}
                </Alert>
              ))}
            </Box>
          )}

          {/* Pool Selection */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 2, 
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider'
            }}
          >
            <TokenPairSelect />
          </Paper>

          {/* Main Content */}
          <Fade in={!isLoading} timeout={500}>
            <Grid container spacing={3}>
              {/* Trading Chart */}
              <Grid item xs={12} lg={8}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2, 
                    height: 500,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider'
                  }}
                >
                  <TradingChart />
                </Paper>
              </Grid>

              {/* Market Stats */}
              <Grid item xs={12} lg={4}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2, 
                    height: 500,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider'
                  }}
                >
                  <MarketStats />
                </Paper>
              </Grid>


              {/* Order Book */}
              <Grid item xs={12}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider'
                  }}
                >
                  <OrderBook />
                </Paper>
              </Grid>

              {/* Position Table */}
              <Grid item xs={12}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2,
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'divider'
                  }}
                >
                  <PositionTable />
                </Paper>
              </Grid>
            </Grid>
          </Fade>
        </Box>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
            action={
              <IconButton
                size="small"
                color="inherit"
                onClick={handleCloseSnackbar}
              >
                <CloseIcon size={16} />
              </IconButton>
            }
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Fade>
  );
}

export default function Dashboard() {
  const theme = useAppTheme();

  return (
    <ThemeProvider theme={theme}>
      <MMTProvider>
        <DashboardContent />
      </MMTProvider>
    </ThemeProvider>
  );
}