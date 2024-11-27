// components/mmt/pools/NetworkWarning.tsx
import { Alert, AlertProps } from '@mui/material';
import { AlertTriangle } from 'lucide-react';

interface NetworkWarningProps extends Omit<AlertProps, 'severity' | 'icon'> {
  network: string;
}

export function NetworkWarning({ network, sx, ...props }: NetworkWarningProps) {
  if (network !== 'mainnet-beta') return null;

  return (
    <Alert 
      severity="warning" 
      icon={<AlertTriangle size={24} />}
      sx={{ mb: 3, ...sx }}
      {...props}
    >
      메인넷에 연결되어 있습니다. 실제 자산이 사용됩니다.
    </Alert>
  );
}