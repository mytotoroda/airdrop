// components/mmt/RebalanceProgressModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Button,
  Chip,
  Stack,
  Divider,
  useTheme
} from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowRightLeft,
  Receipt,
  Wallet
} from 'lucide-react';
import { formatNumber, formatCurrency } from '@/utils/mmt/formatters';

interface RebalanceProgress {
  status: 'preparing' | 'calculating' | 'confirming' | 'executing' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  details: {
    tokenAAmount?: number;
    tokenBAmount?: number;
    expectedPrice?: number;
    estimatedCost?: number;
    txSignature?: string;
  };
  error?: string;
}

interface RebalanceProgressModalProps {
  open: boolean;
  onClose: () => void;
  poolId: number;
  tokenASymbol: string;
  tokenBSymbol: string;
  initialTokenAAmount: number;
  initialTokenBAmount: number;
  targetRatio: number;
}

export default function RebalanceProgressModal({
  open,
  onClose,
  poolId,
  tokenASymbol,
  tokenBSymbol,
  initialTokenAAmount,
  initialTokenBAmount,
  targetRatio
}: RebalanceProgressModalProps) {
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';

  const [progress, setProgress] = useState<RebalanceProgress>({
    status: 'preparing',
    currentStep: 0,
    totalSteps: 4,
    details: {}
  });

  const statusMessages = {
    preparing: '리밸런싱 준비 중...',
    calculating: '최적의 거래 수량 계산 중...',
    confirming: '트랜잭션 승인 대기 중...',
    executing: '리밸런싱 실행 중...',
    completed: '리밸런싱 완료',
    failed: '리밸런싱 실패'
  };

  const startRebalancing = async () => {
    try {
      // 1. 준비 단계
      setProgress(prev => ({
        ...prev,
        status: 'preparing',
        currentStep: 1
      }));

      // 2. 계산 단계
      setProgress(prev => ({
        ...prev,
        status: 'calculating',
        currentStep: 2,
        details: {
          ...prev.details,
          estimatedCost: 0.001 // SOL
        }
      }));

      // 3. 트랜잭션 승인 대기
      setProgress(prev => ({
        ...prev,
        status: 'confirming',
        currentStep: 3
      }));

      // 4. 실제 리밸런싱 실행
      const response = await fetch(`/api/mmt/positions/rebalance/${poolId}`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || '리밸런싱 실행 중 오류가 발생했습니다.');
      }

      // 5. 완료
      setProgress(prev => ({
        ...prev,
        status: 'completed',
        currentStep: 4,
        details: {
          ...prev.details,
          txSignature: data.data.transaction
        }
      }));

    } catch (error) {
      console.error('Rebalancing error:', error);
      setProgress(prev => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      }));
    }
  };

  useEffect(() => {
    if (open) {
      // 모달이 열릴 때 초기화
      setProgress({
        status: 'preparing',
        currentStep: 0,
        totalSteps: 4,
        details: {}
      });
      startRebalancing();
    }
  }, [open]);

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'completed':
        return <CheckCircle2 className="text-green-500" size={24} />;
      case 'failed':
        return <XCircle className="text-red-500" size={24} />;
      default:
        return <Loader2 className="animate-spin" size={24} />;
    }
  };

  const handleClose = () => {
    if (progress.status === 'completed' || progress.status === 'failed') {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: isDark ? 'rgb(17, 24, 39)' : 'white',
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle
        sx={{
          color: isDark ? 'rgb(243, 244, 246)' : 'inherit',
          borderBottom: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <ArrowRightLeft size={20} />
          리밸런싱 진행 상황
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* 진행 상태 표시 */}
          <Stack spacing={3}>
            <Box>
              <Typography
                variant="body2"
                color={isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)'}
                gutterBottom
              >
                진행 상황
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                {getStatusIcon()}
                <Box flexGrow={1}>
                  <Typography
                    variant="body1"
                    color={isDark ? 'rgb(243, 244, 246)' : 'inherit'}
                    gutterBottom
                  >
                    {statusMessages[progress.status]}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(progress.currentStep / progress.totalSteps) * 100}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }} />

            {/* 거래 정보 */}
            <Box>
              <Typography
                variant="body2"
                color={isDark ? 'rgb(156, 163, 175)' : 'rgb(107, 114, 128)'}
                gutterBottom
              >
                거래 정보
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">예상 가스비</Typography>
                  <Typography>
                    {formatNumber(progress.details.estimatedCost || 0)} SOL
                  </Typography>
                </Box>
                {progress.details.txSignature && (
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2">트랜잭션</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      href={`https://solscan.io/tx/${progress.details.txSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Receipt size={16} className="mr-1" />
                      Explorer
                    </Button>
                  </Box>
                )}
              </Stack>
            </Box>

            {/* 에러 메시지 */}
            {progress.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {progress.error}
              </Alert>
            )}
          </Stack>
        </Box>
      </DialogContent>

      {/* 닫기 버튼은 완료 또는 실패 상태에서만 활성화 */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}
      >
        <Button
          onClick={handleClose}
          disabled={!['completed', 'failed'].includes(progress.status)}
        >
          닫기
        </Button>
      </Box>
    </Dialog>
  );
}