// app/api/airdrop/createata/[campaignId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { 
  Connection, 
  Keypair, 
  Transaction, 
  PublicKey,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import bs58 from 'bs58';

export const dynamic = 'force-dynamic';

const CHUNK_SIZE = 8; // 한 트랜잭션에서 처리할 ATA 생성 수

// RPC URL 설정 함수
function getRpcUrl(network: string): string {
  if (network === 'devnet') {
    return process.env.NEXT_PUBLIC_DEVNET_RPC_URL || 'https://api.devnet.solana.com';
  }
  return process.env.NEXT_PUBLIC_MAINNET_RPC_URL || '';
}

// 관리자 지갑 설정
const adminKeypair = (() => {
  try {
    const privateKeyBytes = bs58.decode(process.env.ADMIN_WALLET_PRIVATE_KEY || '');
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch (error) {
    console.error('Error creating keypair:', error);
    throw new Error('Failed to initialize admin wallet');
  }
})();

async function createATABatch(
  connection: Connection,
  mint: PublicKey,
  recipients: any[],
  payer: Keypair
): Promise<{ signature: string; ataAddresses: { id: number; address: string }[] }> {
  try {
    const transaction = new Transaction();
    const ataAddresses: { id: number; address: string }[] = [];

    for (const recipient of recipients) {
      const owner = new PublicKey(recipient.wallet_address);
      const ataAddress = await getAssociatedTokenAddress(
        mint,
        owner,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const ataInfo = await connection.getAccountInfo(ataAddress);
      if (!ataInfo) {
        console.log(`Creating ATA for wallet: ${recipient.wallet_address}`);
        const ix = createAssociatedTokenAccountInstruction(
          payer.publicKey,
          ataAddress,
          owner,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(ix);
      } else {
        console.log(`ATA already exists for wallet: ${recipient.wallet_address}`);
      }

      ataAddresses.push({ id: recipient.id, address: ataAddress.toString() });
    }

    if (transaction.instructions.length > 0) {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payer.publicKey;
      
      transaction.sign(payer);
      
      const signature = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      return { signature, ataAddresses };
    }

    return { signature: '', ataAddresses };
  } catch (error) {
    console.error('Error in createATABatch:', error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const pool = getPool();
  let connection = null;

  try {
    // 네트워크 설정 확인
    const network = process.env.NEXT_PUBLIC_NETWORK;
    if (network !== 'mainnet-beta' && network !== 'devnet') {
      throw new Error('Invalid network configuration');
    }

    const rpcUrl = getRpcUrl(network);
    if (!rpcUrl) {
      throw new Error('RPC URL not configured');
    }

    const solanaConnection = new Connection(rpcUrl, {
      commitment: 'confirmed'
    });

    connection = await pool.getConnection();

    // 캠페인 정보 조회
    const [campaigns] = await connection.execute(
      `SELECT token_address
       FROM airdrop_campaigns 
       WHERE id = ?`,
      [params.campaignId]
    );

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json(
        { message: '캠페인을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const tokenMint = new PublicKey(campaigns[0].token_address);

    // SOL 잔액 확인
    const solBalance = await solanaConnection.getBalance(adminKeypair.publicKey);
    const minimumBalance = 0.01 * LAMPORTS_PER_SOL; // 최소 0.01 SOL 필요
    
    if (solBalance < minimumBalance) {
      throw new Error('Insufficient SOL balance for ATA creation');
    }

    // ATA가 없는 수신자들 조회
    const [recipients] = await connection.execute(
      `SELECT id, wallet_address 
       FROM airdrop_recipients 
       WHERE campaign_id = ? 
       AND (ata_address IS NULL OR ata_address = '')`,
      [params.campaignId]
    );

    console.log(`Processing ${recipients.length} recipients for ATA creation`);

    let successCount = 0;
    let failCount = 0;

    // CHUNK_SIZE 단위로 처리
    for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
      const chunk = recipients.slice(i, i + CHUNK_SIZE);
      
      try {
        const { signature, ataAddresses } = await createATABatch(
          solanaConnection,
          tokenMint,
          chunk,
          adminKeypair
        );

        // DB 업데이트
        if (ataAddresses.length > 0) {
          for (const { id, address } of ataAddresses) {
            await connection.execute(
              `UPDATE airdrop_recipients 
               SET ata_address = ?,
                   updated_at = NOW()
               WHERE id = ?`,
              [address, id]
            );
          }
          
          successCount += ataAddresses.length;
          
          if (signature) {
            console.log(`Batch processed with signature: ${signature}`);
            console.log(`Updated ${ataAddresses.length} recipients`);
          }
        }

      } catch (error) {
        console.error(`Error processing batch:`, error);
        failCount += chunk.length;
        
        // 실패한 경우에도 계속 진행
        continue;
      }

      // 각 청크 처리 후 잠시 대기
      if (i + CHUNK_SIZE < recipients.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'ATA 생성이 완료되었습니다.',
      processedCount: recipients.length,
      successCount,
      failCount
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: 'ATA 생성 중 오류가 발생했습니다.', error: String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}