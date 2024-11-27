'use client';

import React, { useState } from 'react';
import { Box, Button, Card, Container, Typography } from '@mui/material';
import { NATIVE_MINT } from '@solana/spl-token';
import { PublicKey, Connection } from '@solana/web3.js';
import { Raydium, ApiV3PoolInfoStandardItem, AmmV4Keys, AmmRpcData } from '@raydium-io/raydium-sdk-v2';
import BN from 'bn.js';
import { useWallet } from '@/contexts/WalletContext';

const simpleLogger = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

// 테스트 설정
const TEST_CONFIG = {
  poolId: '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2', // SOL-USDC pool
  inputMint: NATIVE_MINT.toBase58(), // SOL
  amountIn: new BN(100000000), // 0.1 SOL (9 decimals)
  slippage: 0.01 // 1%
};

// 유효한 AMM 프로그램 ID들
const validAmmProgramIds = new Set([
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',  // Mainnet AMM
  '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h'   // Devnet AMM
]);

const isValidAmm = (programId: string) => validAmmProgramIds.has(programId);

// SDK 초기화 함수
const initializeSDK = async (walletAdapter: any) => {
  if (!walletAdapter.publicKey) {
    throw new Error('Invalid wallet adapter');
  }

  const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta';
  const rpcUrl = isMainnet 
    ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL 
    : process.env.NEXT_PUBLIC_DEVNET_RPC_URL;

  if (!rpcUrl) throw new Error('RPC URL not configured');
  
  const connection = new Connection(rpcUrl, 'confirmed');

  // 새로운 지갑 어댑터 구조
  const walletAdapter2 = {
    ...walletAdapter,
    publicKey: new PublicKey(walletAdapter.publicKey.toString()),
    // 지갑 타입 명시
    get connected() { return true; },
    get autoApprove() { return false; },
    isConnected: true
  };

  try {
    const sdk = await Raydium.load({
      connection,
      cluster: isMainnet ? 'mainnet' : 'devnet',
      disableFeatureCheck: true,
      blockhashCommitment: 'finalized',
      wallet: walletAdapter2
    });

    if (walletAdapter2.publicKey) {
      sdk.setOwner(walletAdapter2);
    }

    return { sdk, connection };
  } catch (error) {
    console.error('Failed to initialize SDK:', error);
    throw error;
  }
};

const TestSwapPage = () => {
  const { wallet, publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const executeTestSwap = async () => {
    if (!publicKey || !wallet?.signTransaction || !wallet?.signAllTransactions) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError(null);
    setTxId(null);

    try {
      // SDK 초기화 (전체 wallet 객체 전달)
      const { sdk, connection } = await initializeSDK(wallet);
      sdk.logger = simpleLogger;

      // Pool 정보 가져오기
      let poolInfo: ApiV3PoolInfoStandardItem;
      let poolKeys: AmmV4Keys;
      let rpcData: AmmRpcData;

      const isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta';
      console.log('Network:', isMainnet ? 'mainnet' : 'devnet');

      if (isMainnet) {
        const data = await sdk.api.fetchPoolById({ ids: TEST_CONFIG.poolId });
        poolInfo = data[0] as ApiV3PoolInfoStandardItem;
        if (!isValidAmm(poolInfo.programId)) {
          throw new Error('Target pool is not AMM pool');
        }
        poolKeys = await sdk.liquidity.getAmmPoolKeys(TEST_CONFIG.poolId);
        rpcData = await sdk.liquidity.getRpcPoolInfo(TEST_CONFIG.poolId);
      } else {
        const data = await sdk.liquidity.getPoolInfoFromRpc({ poolId: TEST_CONFIG.poolId });
        poolInfo = data.poolInfo;
        poolKeys = data.poolKeys;
        rpcData = data.poolRpcData;
      }

      console.log('Pool info fetched:', poolInfo.id);

      const [baseReserve, quoteReserve, status] = [
        rpcData.baseReserve,
        rpcData.quoteReserve,
        rpcData.status.toNumber()
      ];

      // Input mint 검증
      if (poolInfo.mintA.address !== TEST_CONFIG.inputMint && poolInfo.mintB.address !== TEST_CONFIG.inputMint) {
        throw new Error('Input mint does not match pool');
      }

      // Base/Quote mint 설정
      const baseIn = TEST_CONFIG.inputMint === poolInfo.mintA.address;
      const [mintIn, mintOut] = baseIn 
        ? [poolInfo.mintA, poolInfo.mintB] 
        : [poolInfo.mintB, poolInfo.mintA];

      console.log('Computing amount out...');

      // Amount out 계산
      const out = sdk.liquidity.computeAmountOut({
        poolInfo: {
          ...poolInfo,
          baseReserve,
          quoteReserve,
          status,
          version: 4,
        },
        amountIn: TEST_CONFIG.amountIn,
        mintIn: mintIn.address,
        mintOut: mintOut.address,
        slippage: TEST_CONFIG.slippage
      });

      console.log('Amount out computed:', out);

      // Swap 트랜잭션 생성
      const { execute } = await sdk.liquidity.swap({
        poolInfo,
        poolKeys,
        userKeys: {
          tokenAccounts: [],
          owner: wallet.publicKey,
        },
        amountIn: TEST_CONFIG.amountIn,
        amountOut: out.minAmountOut,
        fixedSide: 'in',
        inputMint: mintIn.address,
        computeBudgetConfig: {
          units: 400000,
          microLamports: 46591500,
        },
      });

      console.log('Swap instruction created, executing...');

      const { txId: transactionId } = await execute({ 
        sendAndConfirm: true 
      });

      console.log('Transaction executed:', transactionId);
      setTxId(transactionId);

    } catch (err) {
      console.error('Swap error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Test Swap Page (SOL → USDC)
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography color="textSecondary">
              Pool: {TEST_CONFIG.poolId}
            </Typography>
            <Typography color="textSecondary">
              Amount: 0.1 SOL
            </Typography>
            <Typography color="textSecondary">
              Slippage: {TEST_CONFIG.slippage * 100}%
            </Typography>
            {publicKey && (
              <Typography color="textSecondary">
                Wallet: {publicKey.toString().slice(0, 8)}...
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={executeTestSwap}
            disabled={loading || !publicKey}
            fullWidth
            sx={{ mb: 2 }}
          >
            {loading ? 'Processing...' : 'Execute Test Swap'}
          </Button>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              Error: {error}
            </Typography>
          )}

          {txId && (
            <Typography color="success.main" sx={{ mt: 2 }}>
              Transaction successful! {' '}
              <a 
                href={`https://solscan.io/tx/${txId}${process.env.NEXT_PUBLIC_NETWORK === 'devnet' ? '?cluster=devnet' : ''}`}
                target="_blank" 
                rel="noopener noreferrer"
                style={{ textDecoration: 'underline' }}
              >
                View on Solscan
              </a>
            </Typography>
          )}
        </Card>
      </Box>
    </Container>
  );
};

export default TestSwapPage;