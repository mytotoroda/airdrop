// components/TransactionConfirmDialog.tsx
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography,
  Box
} from '@mui/material';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: string;
  recipient: string;
  loading?: boolean;
}

export default function TransactionConfirmDialog({
  open,
  onClose,
  onConfirm,
  amount,
  recipient,
  loading
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangle color="orange" />
          트랜잭션 확인
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body1" gutterBottom>
          다음 트랜잭션을 실행하시겠습니까?
        </Typography>
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            보내는 금액
          </Typography>
          <Typography variant="h6">
            {amount} SOL
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} gutterBottom>
            받는 주소
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {recipient}
          </Typography>
        </Box>
        <Typography color="error" sx={{ mt: 2 }} variant="body2">
          * 이 트랜잭션은 취소할 수 없습니다.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          취소
        </Button>
        <Button 
          onClick={onConfirm} 
          variant="contained" 
          color="primary"
          disabled={loading}
        >
          {loading ? '처리 중...' : '전송 확인'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}