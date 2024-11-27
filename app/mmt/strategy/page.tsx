// app/mmt/strategy/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { formatNumber } from '@/utils/mmt/formatters';
import TokenPairSelect from '@/components/mmt/TokenPairSelect';
import {
  Container,
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  Typography,
  Box,
  Slider,
  Tooltip,
  Snackbar,
  CircularProgress,
  useTheme
} from '@mui/material';
import { Settings2, AlertTriangle, Save, RefreshCw, Info } from 'lucide-react';
import { useMMT } from '@/contexts/mmt/MMTContext';

// AMM 전략 설정 타입 정의
interface AMMStrategyConfig {
  baseSpread: number;
  bidAdjustment: number;
  askAdjustment: number;
  checkInterval: number;
  minTokenATrade: number;
  maxTokenATrade: number;
  minTokenBTrade: number;
  maxTokenBTrade: number;
  tradeSizePercentage: number;
  targetRatio: number;
  rebalanceThreshold: number;
  maxPositionSize: number;
  maxSlippage: number;
  stopLossPercentage: number;
  emergencyStop: boolean;
  enabled: boolean;
  minLiquidity: number;
  maxLiquidity: number;
}

const defaultConfig: AMMStrategyConfig = {
  baseSpread: 0.2,
  bidAdjustment: -0.05,
  askAdjustment: 0.05,
  checkInterval: 30,
  minTokenATrade: 0.1,
  maxTokenATrade: 10,
  minTokenBTrade: 1,
  maxTokenBTrade: 1000,
  tradeSizePercentage: 10,
  targetRatio: 0.5,
  rebalanceThreshold: 10.0,
  maxPositionSize: 50000,
  maxSlippage: 1.0,
  stopLossPercentage: 5.0,
  emergencyStop: false,
  enabled: false,
  minLiquidity: 1000,
  maxLiquidity: 1000000
};

export default function StrategyConfig() {
  const theme = useTheme();
  const { publicKey } = useWallet();
  const { selectedPool } = useMMT();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<AMMStrategyConfig>(defaultConfig);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // 선택된 풀의 전략 설정 로드
  useEffect(() => {
    const fetchPoolStrategy = async () => {
      if (!selectedPool) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/mmt/strategy/config?poolId=${selectedPool.pool_id}`);
        const data = await response.json();
        if (data.success) {
          setConfig(data.config);
        } else {
          showSnackbar(data.message || '전략 설정을 불러오는데 실패했습니다.', 'error');
        }
      } catch (error) {
        console.error('Failed to fetch strategy config:', error);
        showSnackbar('전략 설정을 불러오는데 실패했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchPoolStrategy();
  }, [selectedPool]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleSave = async () => {
    if (!selectedPool || !publicKey) {
      showSnackbar('풀을 선택해주세요.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/mmt/strategy/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poolId: selectedPool.pool_id,
          walletAddress: publicKey,
          ...config
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        showSnackbar('설정이 성공적으로 저장되었습니다.', 'success');
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error updating strategy:', error);
      showSnackbar(
        error instanceof Error ? error.message : '설정 저장에 실패했습니다.', 
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Settings2 size={24} color={theme.palette.primary.main} />
            <Typography variant="h5" sx={{ ml: 1 }}>
              AMM 마켓 메이킹 전략 설정
            </Typography>
          </Box>
        </Grid>

        {/* Pool Selection */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 6 }}>
              <TokenPairSelect />
            </CardContent>
          </Card>
        </Grid>

        {/* Warning Alert */}
        <Grid item xs={12}>
          <Alert 
            severity="warning"
            icon={<AlertTriangle />}
          >
            AMM 전략 설정을 변경하면 즉시 적용되며, 자동 거래에 영향을 미칠 수 있습니다.
          </Alert>
        </Grid>

        {/* 여기서부터 Part 2로 이어집니다... */}

	{/* Base Trading Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="기본 거래 설정"
              subheader="스프레드 및 거래 주기 설정"
            />
            <CardContent sx={{ p: 6 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    기본 스프레드
                  </Typography>
                  <Slider
                    value={config.baseSpread}
                    onChange={(_, value) => setConfig(prev => ({
                      ...prev,
                      baseSpread: value as number
                    }))}
                    min={0.1}
                    max={5}
                    step={0.1}
                    marks={[
                      { value: 0.1, label: '0.1%' },
                      { value: 5, label: '5%' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={value => `${value}%`}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="매수 스프레드 조정"
                    type="number"
                    value={config.bidAdjustment}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      bidAdjustment: parseFloat(e.target.value)
                    }))}
                    InputProps={{
                      endAdornment: <Typography>%</Typography>,
                      inputProps: { step: 0.01 }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="매도 스프레드 조정"
                    type="number"
                    value={config.askAdjustment}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      askAdjustment: parseFloat(e.target.value)
                    }))}
                    InputProps={{
                      endAdornment: <Typography>%</Typography>,
                      inputProps: { step: 0.01 }
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="가격 체크 주기"
                    type="number"
                    value={config.checkInterval}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      checkInterval: parseInt(e.target.value)
                    }))}
                    InputProps={{
                      endAdornment: <Typography>초</Typography>,
                      inputProps: { min: 1 }
                    }}
                    helperText="가격 업데이트 및 재조정 검사 주기"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Trade Size Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="거래 크기 설정"
              subheader="토큰별 최소/최대 거래량 설정"
            />
            <CardContent sx={{ p: 6 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    거래 크기 (유동성 대비)
                  </Typography>
                  <Slider
                    value={config.tradeSizePercentage}
                    onChange={(_, value) => setConfig(prev => ({
                      ...prev,
                      tradeSizePercentage: value as number
                    }))}
                    min={1}
                    max={50}
                    marks={[
                      { value: 1, label: '1%' },
                      { value: 50, label: '50%' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={value => `${value}%`}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={`최소 ${selectedPool?.tokenA?.symbol || 'Token A'} 거래량`}
                    type="number"
                    value={config.minTokenATrade}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      minTokenATrade: parseFloat(e.target.value)
                    }))}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={`최대 ${selectedPool?.tokenA?.symbol || 'Token A'} 거래량`}
                    type="number"
                    value={config.maxTokenATrade}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      maxTokenATrade: parseFloat(e.target.value)
                    }))}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={`최소 ${selectedPool?.tokenB?.symbol || 'Token B'} 거래량`}
                    type="number"
                    value={config.minTokenBTrade}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      minTokenBTrade: parseFloat(e.target.value)
                    }))}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={`최대 ${selectedPool?.tokenB?.symbol || 'Token B'} 거래량`}
                    type="number"
                    value={config.maxTokenBTrade}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      maxTokenBTrade: parseFloat(e.target.value)
                    }))}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Position Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="포지션 관리"
              subheader="재조정 및 포지션 한도 설정"
            />
            <CardContent sx={{ p: 6 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    목표 토큰 비율
                  </Typography>
                  <Slider
                    value={config.targetRatio * 100}
                    onChange={(_, value) => setConfig(prev => ({
                      ...prev,
                      targetRatio: (value as number) / 100
                    }))}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 50, label: '50%' },
                      { value: 100, label: '100%' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={value => `${value}%`}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="재조정 임계값"
                    type="number"
                    value={config.rebalanceThreshold}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      rebalanceThreshold: parseFloat(e.target.value)
                    }))}
                    InputProps={{
                      endAdornment: <Typography>%</Typography>
                    }}
                    helperText="목표 비율에서 벗어난 정도가 이 값을 초과하면 재조정"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="유동성 한도"
                    type="number"
                    value={config.maxPositionSize}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      maxPositionSize: parseFloat(e.target.value)
                    }))}
                    InputProps={{
                      endAdornment: <Typography>USD</Typography>
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Management */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="위험 관리"
              subheader="슬리피지 및 손실 방지 설정"
            />
            <CardContent sx={{ p: 6 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="최대 허용 슬리피지"
                    type="number"
                    value={config.maxSlippage}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      maxSlippage: parseFloat(e.target.value)
                    }))}
                    InputProps={{
                      endAdornment: <Typography>%</Typography>
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="손절 기준"
                    type="number"
                    value={config.stopLossPercentage}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      stopLossPercentage: parseFloat(e.target.value)
                    }))}
                    InputProps={{
                      endAdornment: <Typography>%</Typography>
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.emergencyStop}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          emergencyStop: e.target.checked
                        }))}
                        color="error"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ mr: 1 }}>긴급 중지</Typography>
                        <Tooltip title="활성화 시 모든 자동 거래가 즉시 중지됩니다.">
                          <Info size={16} />
                        </Tooltip>
                      </Box>
                    }
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Bottom Controls */}
        <Grid item xs={12}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: 2 
          }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enabled}
                  onChange={(e) => setConfig(prev => ({
                    ...prev,
                    enabled: e.target.checked
                  }))}
                  color="success"
                />
              }
              label={
                <Typography variant="h6" sx={{ ml: 1 }}>
                  전략 활성화
                </Typography>
              }
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshCw />}
                onClick={handleReset}
                disabled={loading}
              >
                기본값으로 초기화
              </Button>
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                onClick={handleSave}
                disabled={loading || !selectedPool}
              >
                {loading ? '저장 중...' : '설정 저장'}
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}