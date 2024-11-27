import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControlLabel,
  Switch,
  Alert,
  Typography,
  Divider,
  Tooltip,
  IconButton,
  Slider,
  useTheme
} from '@mui/material';
import { Settings2, HelpCircle } from 'lucide-react';

interface Pool {
  pool_id: number;
  id: string;
  poolAddress: string;
  tokenA: {
    symbol: string;
    address: string;
    decimals: number;
  };
  tokenB: {
    symbol: string;
    address: string;
    decimals: number;
  };
  lastPrice: number;
  liquidityUsd: number;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
}

interface PoolConfig {
  base_spread: number;
  bid_adjustment: number;
  ask_adjustment: number;
  check_interval: number;
  min_token_a_trade: number;
  max_token_a_trade: number;
  min_token_b_trade: number;
  max_token_b_trade: number;
  trade_size_percentage: number;
  target_ratio: number;
  rebalance_threshold: number;
  max_slippage: number;
  stop_loss_percentage: number;
  emergency_stop: boolean;
  enabled: boolean;
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

interface EditPoolDialogProps {
  open: boolean;
  pool: Pool;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditPoolDialog({ open, pool, onClose, onSuccess }: EditPoolDialogProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<PoolConfig>({
    base_spread: 0.2,
    bid_adjustment: -0.05,
    ask_adjustment: 0.05,
    check_interval: 30,
    min_token_a_trade: 0,
    max_token_a_trade: 0,
    min_token_b_trade: 0,
    max_token_b_trade: 0,
    trade_size_percentage: 10,
    target_ratio: 0.5,
    rebalance_threshold: 10,
    max_slippage: 1.0,
    stop_loss_percentage: 5.0,
    emergency_stop: false,
    enabled: false
  });

  useEffect(() => {
	  const loadPoolConfig = async () => {
	    try {
	      const response = await fetch(`/api/mmt/pool-config/${pool.pool_id}`);
	      if (!response.ok) throw new Error('Failed to load config');
	      const { success, config: loadedConfig } = await response.json();
	      
	      if (success && loadedConfig) {
		setConfig({
		  base_spread: Number(loadedConfig.base_spread),
		  bid_adjustment: Number(loadedConfig.bid_adjustment),
		  ask_adjustment: Number(loadedConfig.ask_adjustment),
		  check_interval: Number(loadedConfig.check_interval),
		  min_token_a_trade: Number(loadedConfig.min_token_a_trade),
		  max_token_a_trade: Number(loadedConfig.max_token_a_trade),
		  min_token_b_trade: Number(loadedConfig.min_token_b_trade),
		  max_token_b_trade: Number(loadedConfig.max_token_b_trade),
		  trade_size_percentage: Number(loadedConfig.trade_size_percentage),
		  target_ratio: Number(loadedConfig.target_ratio),
		  rebalance_threshold: Number(loadedConfig.rebalance_threshold),
		  max_slippage: Number(loadedConfig.max_slippage),
		  stop_loss_percentage: Number(loadedConfig.stop_loss_percentage),
		  emergency_stop: Boolean(loadedConfig.emergency_stop),
		  enabled: Boolean(loadedConfig.enabled)
		});
	      }
	    } catch (error) {
	      console.error('Error loading pool config:', error);
	      setError('설정을 불러오는데 실패했습니다.');
	    }
	  };

	  if (open && pool.pool_id) {
	    loadPoolConfig();
	  }
	}, [pool.pool_id, open]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/mmt/pool-config/${pool.pool_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to update config');
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || '설정 업데이트에 실패했습니다.');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating pool config:', error);
      setError(error instanceof Error ? error.message : '설정 업데이트 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings2 />
        <Typography variant="h6">
          {pool.tokenA.symbol}/{pool.tokenB.symbol} Pool 설정
        </Typography>
      </Box>
    </DialogTitle>
    
    <Divider />
    
    <DialogContent>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* 기본 스프레드 설정 */}
        <Box>
          <TooltipLabel 
            label="기본 스프레드" 
            tooltip="AMM 풀의 기본 스프레드 비율 (%)" 
          />
          <Slider
            value={config.base_spread}
            onChange={(_, value) => setConfig(prev => ({
              ...prev,
              base_spread: value as number
            }))}
            min={0.1}
            max={1}
            step={0.1}
            marks
            valueLabelDisplay="auto"
            valueLabelFormat={v => `${v}%`}
          />
        </Box>

        {/* 스프레드 조정 */}
        <Box>
          <TooltipLabel 
            label="스프레드 조정" 
            tooltip="기본 스프레드에 대한 매수/매도 조정값" 
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                매수 스프레드 조정
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={config.bid_adjustment}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  bid_adjustment: parseFloat(e.target.value)
                }))}
                InputProps={{
                  endAdornment: <Typography variant="caption">%</Typography>
                }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                매도 스프레드 조정
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={config.ask_adjustment}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  ask_adjustment: parseFloat(e.target.value)
                }))}
                InputProps={{
                  endAdornment: <Typography variant="caption">%</Typography>
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* 거래 크기 제한 - Token A */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {pool.tokenA.symbol} 거래 크기 제한
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                최소 거래량
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={config.min_token_a_trade}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  min_token_a_trade: parseFloat(e.target.value)
                }))}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                최대 거래량
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={config.max_token_a_trade}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  max_token_a_trade: parseFloat(e.target.value)
                }))}
              />
            </Box>
          </Box>
        </Box>

        {/* 거래 크기 제한 - Token B */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {pool.tokenB.symbol} 거래 크기 제한
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                최소 거래량
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={config.min_token_b_trade}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  min_token_b_trade: parseFloat(e.target.value)
                }))}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                최대 거래량
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={config.max_token_b_trade}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  max_token_b_trade: parseFloat(e.target.value)
                }))}
              />
            </Box>
          </Box>
        </Box>

        {/* 리밸런싱 설정 */}
        <Box>
          <TooltipLabel 
            label="리밸런싱 설정" 
            tooltip="포지션 리밸런싱 관련 설정" 
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                목표 비율
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={config.target_ratio * 100}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  target_ratio: parseFloat(e.target.value) / 100
                }))}
                InputProps={{
                  endAdornment: <Typography variant="caption">%</Typography>
                }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                리밸런싱 임계값
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={config.rebalance_threshold}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  rebalance_threshold: parseFloat(e.target.value)
                }))}
                InputProps={{
                  endAdornment: <Typography variant="caption">%</Typography>
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* 리스크 관리 설정 */}
        <Box>
          <TooltipLabel 
            label="리스크 관리" 
            tooltip="거래 실행 관련 안전장치" 
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                최대 슬리피지
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={config.max_slippage}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  max_slippage: parseFloat(e.target.value)
                }))}
                InputProps={{
                  endAdornment: <Typography variant="caption">%</Typography>
                }}
              />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                손절 기준
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="number"
                value={config.stop_loss_percentage}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  stop_loss_percentage: parseFloat(e.target.value)
                }))}
                InputProps={{
                  endAdornment: <Typography variant="caption">%</Typography>
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* 전략 활성화 설정 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          bgcolor: 'action.hover',
          borderRadius: 1,
          p: 2
        }}>
          <FormControlLabel
            control={
              <Switch
                checked={config.enabled}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  enabled: e.target.checked,
                  emergency_stop: e.target.checked ? false : prev.emergency_stop
                }))}
                color="success"
              />
            }
            label={
              <Typography variant="subtitle2">전략 활성화</Typography>
            }
          />
          <FormControlLabel
            control={
              <Switch
                checked={config.emergency_stop}
                onChange={e => setConfig(prev => ({
                  ...prev,
                  emergency_stop: e.target.checked,
                  enabled: e.target.checked ? false : prev.enabled
                }))}
                color="error"
              />
            }
            label={
              <Typography variant="subtitle2" color="error">긴급 중지</Typography>
            }
          />
        </Box>
      </Box>
    </DialogContent>

    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} variant="outlined">
        취소
      </Button>
      <Button 
        onClick={handleSubmit} 
        variant="contained"
        disabled={loading}
      >
        {loading ? '저장 중...' : '설정 저장'}
      </Button>
    </DialogActions>
  </Dialog>
);
}