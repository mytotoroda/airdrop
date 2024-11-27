// components/amm/TransactionStatus.tsx
import React, { useEffect, useState } from 'react';
import { Alert, CircularProgress, Snackbar } from '@mui/material';
import { Connection, PublicKey } from '@solana/web3.js';

interface TransactionStatusProps {
  signature?: string;
  onConfirm?: () => void;
  onError?: (error: Error) => void;
}

export default function TransactionStatus({
  signature,
  onConfirm,
  onError
}: TransactionStatusProps) {
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'error'>('pending');
  const [open, setOpen] = useState(Boolean(signature));

  useEffect(() => {
    if (!signature) return;

    const connection = new Connection(
      process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta'
        ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL!
        : process.env.NEXT_PUBLIC_MAINNET_RPC_URL2!,
      'confirmed'
    );

    const checkSignature = async () => {
      try {
        const confirmation = await connection.confirmTransaction(signature);
        
        if (confirmation.value.err) {
          throw new Error('Transaction failed');
        }

        setStatus('confirmed');
        onConfirm?.();
      } catch (error: any) {
        setStatus('error');
        onError?.(error);
      }
    };

    checkSignature();
  }, [signature, onConfirm, onError]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Snackbar 
      open={open} 
      autoHideDuration={status === 'confirmed' ? 3000 : null}
      onClose={handleClose}
    >
      <Alert 
        severity={
          status === 'pending' ? 'info' : 
          status === 'confirmed' ? 'success' : 
          'error'
        }
        icon={status === 'pending' ? <CircularProgress size={20} /> : undefined}
      >
        {status === 'pending' && '트랜잭션 처리 중...'}
        {status === 'confirmed' && '트랜잭션이 성공적으로 완료되었습니다.'}
        {status === 'error' && '트랜잭션 처리 중 오류가 발생했습니다.'}
      </Alert>
    </Snackbar>
  );
}