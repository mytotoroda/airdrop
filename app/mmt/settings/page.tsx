// app/mmt/settings/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { useTheme as useNextTheme } from 'next-themes';
import { useWallet } from '@/contexts/WalletContext';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Settings,
  Bell,
  Mail,
  MessageSquare,
  Rocket,
  Shield,
  RefreshCw,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface NotificationSettings {
  email: string;
  telegram: string;
  discord: string;
  emailEnabled: boolean;
  telegramEnabled: boolean;
  discordEnabled: boolean;
}

interface GlobalSettings {
  maxGasPrice: number;
  defaultSlippage: number;
  emergencyStopLoss: number;
  rpcEndpoint: string;
  autoRebalancing: boolean;
  webhookUrl: string;
}

const SettingsPage = () => {
  const { resolvedTheme } = useNextTheme();
  const isDark = resolvedTheme === 'dark';
  const { network, publicKey } = useWallet();

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: '',
    telegram: '',
    discord: '',
    emailEnabled: false,
    telegramEnabled: false,
    discordEnabled: false,
  });

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    maxGasPrice: 0.000005,
    defaultSlippage: 1.0,
    emergencyStopLoss: 5.0,
    rpcEndpoint: '',
    autoRebalancing: true,
    webhookUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 설정 불러오기
  useEffect(() => {
    fetchSettings();
  }, [publicKey]);

  const fetchSettings = async () => {
    if (!publicKey) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/mmt/settings');
      const data = await response.json();
      
      if (data.success) {
        setGlobalSettings(data.globalSettings);
        setNotificationSettings(data.notificationSettings);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!publicKey) {
      setError('지갑이 연결되어 있지 않습니다.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/mmt/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          globalSettings,
          notificationSettings,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess('설정이 성공적으로 저장되었습니다.');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('설정 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            color: isDark ? 'grey.100' : 'grey.900',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Settings size={32} />
          MMT 설정
        </Typography>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert 
          severity="success" 
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 전역 설정 카드 */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={isDark ? 2 : 1}
            sx={{
              bgcolor: isDark ? 'grey.800' : 'background.paper',
            }}
          >
            <CardHeader 
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rocket size={24} />
                  <Typography variant="h6" color={isDark ? 'grey.100' : 'grey.900'}>
                    전역 설정
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <TextField
                      label="최대 가스 가격 (SOL)"
                      type="number"
                      value={globalSettings.maxGasPrice}
                      onChange={(e) => setGlobalSettings({
                        ...globalSettings,
                        maxGasPrice: parseFloat(e.target.value)
                      })}
                      InputProps={{
                        endAdornment: (
                          <Tooltip title="트랜잭션당 최대 가스 비용">
                            <Info size={16} />
                          </Tooltip>
                        ),
                      }}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <TextField
                      label="기본 슬리피지 (%)"
                      type="number"
                      value={globalSettings.defaultSlippage}
                      onChange={(e) => setGlobalSettings({
                        ...globalSettings,
                        defaultSlippage: parseFloat(e.target.value)
                      })}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <TextField
                      label="비상 손절 한도 (%)"
                      type="number"
                      value={globalSettings.emergencyStopLoss}
                      onChange={(e) => setGlobalSettings({
                        ...globalSettings,
                        emergencyStopLoss: parseFloat(e.target.value)
                      })}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <TextField
                      label="RPC 엔드포인트"
                      value={globalSettings.rpcEndpoint}
                      onChange={(e) => setGlobalSettings({
                        ...globalSettings,
                        rpcEndpoint: e.target.value
                      })}
                    />
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={globalSettings.autoRebalancing}
                        onChange={(e) => setGlobalSettings({
                          ...globalSettings,
                          autoRebalancing: e.target.checked
                        })}
                      />
                    }
                    label="자동 리밸런싱 활성화"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* 알림 설정 카드 */}
        <Grid item xs={12} md={6}>
          <Card
            elevation={isDark ? 2 : 1}
            sx={{
              bgcolor: isDark ? 'grey.800' : 'background.paper',
            }}
          >
            <CardHeader 
              title={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Bell size={24} />
                  <Typography variant="h6" color={isDark ? 'grey.100' : 'grey.900'}>
                    알림 설정
                  </Typography>
                </Box>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl fullWidth>
                      <TextField
                        label="이메일 주소"
                        value={notificationSettings.email}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          email: e.target.value
                        })}
                      />
                    </FormControl>
                    <Switch
                      checked={notificationSettings.emailEnabled}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        emailEnabled: e.target.checked
                      })}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl fullWidth>
                      <TextField
                        label="텔레그램 ID"
                        value={notificationSettings.telegram}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          telegram: e.target.value
                        })}
                      />
                    </FormControl>
                    <Switch
                      checked={notificationSettings.telegramEnabled}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        telegramEnabled: e.target.checked
                      })}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControl fullWidth>
                      <TextField
                        label="디스코드 웹훅 URL"
                        value={notificationSettings.discord}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          discord: e.target.value
                        })}
                      />
                    </FormControl>
                    <Switch
                      checked={notificationSettings.discordEnabled}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        discordEnabled: e.target.checked
                      })}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={saveSettings}
          disabled={loading}
          startIcon={loading ? <RefreshCw className="animate-spin" /> : <Shield />}
          sx={{
            bgcolor: isDark ? 'primary.dark' : 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: isDark ? 'primary.main' : 'primary.dark',
            }
          }}
        >
          {loading ? '저장 중...' : '설정 저장'}
        </Button>
      </Box>
    </Container>
  );
};

export default SettingsPage;