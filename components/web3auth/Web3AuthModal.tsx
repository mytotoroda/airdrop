// components/web3auth/Web3AuthModal.tsx
'use client';

import { useEffect } from 'react';
import { Dialog, DialogContent, IconButton, Box } from '@mui/material';
import { X } from 'lucide-react';
import Web3AuthProfile from '@/components/web3auth/Web3AuthProfile';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  balance: number;
}

export default function Web3AuthModal({ open, onClose, balance }: Props) {
  const { isAuthenticated } = useWeb3Auth();

  useEffect(() => {
    if (!isAuthenticated) {
      onClose();
    }
  }, [isAuthenticated, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <IconButton
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
        }}
      >
        <X size={20} />
      </IconButton>
      <DialogContent>
        <Web3AuthProfile balance={balance} />
      </DialogContent>
    </Dialog>
  );
}