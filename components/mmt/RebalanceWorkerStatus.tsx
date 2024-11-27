// components/mmt/RebalanceWorkerStatus.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Box,
  Typography,
  Switch,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  LinearProgress,
  useTheme
} from '@mui/material';
import { useTheme as useNextTheme } from 'next-themes';
import { 
  Play, 
  Pause, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react';

interface WorkerStatus {
  isRunning: boolean;
  lastCheck: string;
  activePoolsCount: number;
  pendingRebalances: number;
  lastError?: string;
}

export default function RebalanceWorkerStatus() {
  const muiTheme = useTheme();
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';

  const [status, setStatus] = useState<WorkerStatus>({
    isRunning: false,
    lastCheck: '',
    activePoolsCount: 0,
    pendingRebalances: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/mmt/worker/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data.status);
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      setError('상태 조회 중 오류가 발생했습니다.');
      console.error('Worker status error:', err);
    }
  };

  const toggleWorker = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/mmt/worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: status.isRunning ? 'stop' : 'start'
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }

      await fetchStatus();
    } catch (err) {
      setError('워커 제어 중 오류가 발생했습니다.');
      console.error('Worker control error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // 30초마다 상태 갱신
    return () => clearInterval(interval);
  }, []);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        bgcolor: isDark ? 'rgb(17, 24, 39)' : 'white',
        border: 1,
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" component="h2">
          자동 리밸런싱 상태
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title="상태 새로고침">
            <IconButton 
              onClick={fetchStatus}
              size="small"
              disabled={isLoading}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
          <Switch
            checked={status.isRunning}
            onChange={toggleWorker}
            disabled={isLoading}
            icon={<Pause size={16} />}
            checkedIcon={<Play size={16} />}
          />
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          icon={<AlertCircle size={16} />}
        >
          {error}
        </Alert>
      )}

      <Box display="flex" gap={2} flexWrap="wrap">
        <Chip
          icon={status.isRunning ? 
            <CheckCircle size={16} /> : 
            <Pause size={16} />
          }
          label={status.isRunning ? '실행 중' : '중지됨'}
          color={status.isRunning ? 'success' : 'default'}
          variant="outlined"
        />
        <Chip
          icon={<Loader size={16} />}
          label={`활성 풀: ${status.activePoolsCount}`}
          variant="outlined"
        />
        {status.pendingRebalances > 0 && (
          <Chip
            icon={<RefreshCw size={16} />}
            label={`대기 중: ${status.pendingRebalances}`}
            color="warning"
            variant="outlined"
          />
        )}
      </Box>

      {isLoading && (
        <LinearProgress 
          sx={{ 
            mt: 2,
            bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }} 
        />
      )}

      <Box mt={2}>
        <Typography variant="body2" color="text.secondary">
          마지막 체크: {status.lastCheck ? 
            new Date(status.lastCheck).toLocaleString() : 
            '없음'
          }
        </Typography>
        {status.lastError && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            마지막 오류: {status.lastError}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}