// components/mmt/pools/NewPoolDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  Typography,
  Divider,
  Tooltip,
  IconButton,
  useTheme,
  Slider
} from '@mui/material';
import { useWallet } from '@/contexts/WalletContext';
import { Info, HelpCircle } from 'lucide-react';

interface NewPoolDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TooltipLabelProps {
  label: string;
  tooltip: string;
}

const TooltipLabel = ({ label, tooltip }: TooltipLabelProps) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <Typography variant="subtitle2">{label}</Typography>
    <Tooltip title={tooltip} arrow placement="top">
      <IconButton size="small" sx={{ p: 0.5 }}>
        <HelpCircle size={16} />
      </IconButton>
    </Tooltip>
  </Box>
);

// 새로운 전략 설정 인터페이스
interface StrategyConfig {
  baseSpread: number;
  bidAdjustment: number;
  askAdjustment: number;
  checkInterval: number;
  minTradeSize: number;
  maxTradeSize: number;
  tradeSizePercentage: number;
  targetRatio: number;
  rebalanceThreshold: number;
  maxPositionSize: number;
  maxSlippage: number;
  stopLossPercentage: number;
  emergencyStop: boolean;
  enabled: boolean;
}

export default function NewPoolDialog({ open, onClose, onSuccess }: NewPoolDialogProps) {
  const theme = useTheme();
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 초기 폼 데이터
  const [formData, setFormData] = useState({
    pool_address: '',
    token_a_address: '',
    token_a_symbol: '',
    token_a_decimals: 9,
    token_b_address: '',
    token_b_symbol: '',
    token_b_decimals: 9,
    pool_type: 'CL' as const,
    fee_rate: 0.0025,
    config: {
      baseSpread: 0.1,
      bidAdjustment: -0.05,
      askAdjustment: 0.05,
      checkInterval: 30,
      minTradeSize: 100,
      maxTradeSize: 10000,
      tradeSizePercentage: 5,
      targetRatio: 0.5,
      rebalanceThreshold: 5.0,
      maxPositionSize: 50000,
      maxSlippage: 1.0,
      stopLossPercentage: 5.0,
      emergencyStop: false,
      enabled: false
    } as StrategyConfig
  });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      if (!publicKey) {
        throw new Error('지갑이 연결되지 않았습니다.');
      }

      const response = await fetch('/api/mmt/pools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          creator_wallet: publicKey
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '풀 생성에 실패했습니다.');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating pool:', error);
      setError(error instanceof Error ? error.message : '풀 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: theme.palette.background.paper,
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Info size={24} />
          <Typography variant="h6">새 풀 생성</Typography>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* 기본 정보 섹션 */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            기본 정보
          </Typography>

          <Box>
            <TooltipLabel 
              label="풀 주소" 
              tooltip="Raydium 유동성 풀의 온체인 주소" 
            />
            <TextField
              fullWidth
              size="small"
              placeholder="예: 7quH...3EDp"
              value={formData.pool_address}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                pool_address: e.target.value
              }))}
              sx={{ mt: 1 }}
            />
          </Box>

          {/* 토큰 정보 */}
          <Grid container spacing={2}>
            {/* 토큰 A */}
            <Grid item xs={12} md={6}>
              <TooltipLabel 
                label="토큰 A 정보" 
                tooltip="첫 번째 토큰 정보" 
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                <TextField
                  size="small"
                  label="주소"
                  value={formData.token_a_address}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    token_a_address: e.target.value
                  }))}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    label="심볼"
                    value={formData.token_a_symbol}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      token_a_symbol: e.target.value
                    }))}
                  />
                  <TextField
                    size="small"
                    label="소수점"
                    type="number"
                    value={formData.token_a_decimals}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      token_a_decimals: parseInt(e.target.value)
                    }))}
                    InputProps={{ inputProps: { min: 0, max: 18 } }}
                  />
                </Box>
              </Box>
            </Grid>

            {/* 토큰 B */}
            <Grid item xs={12} md={6}>
              <TooltipLabel 
                label="토큰 B 정보" 
                tooltip="두 번째 토큰 정보" 
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                <TextField
                  size="small"
                  label="주소"
                  value={formData.token_b_address}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    token_b_address: e.target.value
                  }))}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    label="심볼"
                    value={formData.token_b_symbol}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      token_b_symbol: e.target.value
                    }))}
                  />
                  <TextField
                    size="small"
                    label="소수점"
                    type="number"
                    value={formData.token_b_decimals}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      token_b_decimals: parseInt(e.target.value)
                    }))}
                    InputProps={{ inputProps: { min: 0, max: 18 } }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Divider />

          {/* 전략 설정 섹션 */}
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            전략 설정
          </Typography>

          {/* 스프레드 설정 */}
          <Box>
            <TooltipLabel 
              label="기본 스프레드" 
              tooltip="기준이 되는 스프레드 비율" 
            />
            <Slider
              value={formData.config.baseSpread}
              onChange={(_, value) => setFormData(prev => ({
                ...prev,
                config: {
                  ...prev.config,
                  baseSpread: value as number
                }
              }))}
              min={0.1}
              max={5}
              step={0.1}
              marks={[
                { value: 0.1, label: '0.1%' },
                { value: 5, label: '5%' }
              ]}
              valueLabelDisplay="auto"
              valueLabelFormat={v => `${v}%`}
            />
          </Box>

          {/* 거래 크기 설정 */}
          <Box>
            <TooltipLabel 
              label="거래 크기" 
              tooltip="최소/최대 거래 크기 설정" 
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                size="small"
                label="최소"
                type="number"
                value={formData.config.minTradeSize}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    minTradeSize: parseFloat(e.target.value)
                  }
                }))}
              />
              <TextField
                size="small"
                label="최대"
                type="number"
                value={formData.config.maxTradeSize}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    maxTradeSize: parseFloat(e.target.value)
                  }
                }))}
              />
            </Box>
          </Box>

          {/* 재조정 설정 */}
          <Box>
            <TooltipLabel 
              label="재조정 설정" 
              tooltip="포지션 재조정 관련 설정" 
            />
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: 1,
              mt: 1 
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextField
                  size="small"
                  label="목표 비율"
                  type="number"
                  value={formData.config.targetRatio * 100}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      targetRatio: parseFloat(e.target.value) / 100
                    }
                  }))}
                  InputProps={{
                    endAdornment: <Typography variant="caption">%</Typography>
                  }}
                />
                <TextField
                  size="small"
                  label="재조정 임계값"
                  type="number"
                  value={formData.config.rebalanceThreshold}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: {
                      ...prev.config,
                      rebalanceThreshold: parseFloat(e.target.value)
                    }
                  }))}
                  InputProps={{
                    endAdornment: <Typography variant="caption">%</Typography>
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* 위험 관리 설정 */}
          <Box>
            <TooltipLabel 
              label="위험 관리" 
              tooltip="슬리피지 및 손실 제한 설정" 
            />
            <Box sx={{ 
              display: 'flex', 
              gap: 2,
              mt: 1 
            }}>
              <TextField
                size="small"
                label="최대 슬리피지"
                type="number"
                value={formData.config.maxSlippage}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    maxSlippage: parseFloat(e.target.value)
                  }
                }))}
                InputProps={{
                  endAdornment: <Typography variant="caption">%</Typography>
                }}
              />
              <TextField
                size="small"
                label="손절 기준"
                type="number"
                value={formData.config.stopLossPercentage}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  config: {
                    ...prev.config,
                    stopLossPercentage: parseFloat(e.target.value)
                  }
                }))}
                InputProps={{
                  endAdornment: <Typography variant="caption">%</Typography>
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <Divider />
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={onClose}
          variant="outlined"
        >
          취소
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !publicKey}
        >
          {loading ? '생성 중...' : '생성'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}