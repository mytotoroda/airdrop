import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { Connection, Keypair, Transaction, PublicKey } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import bs58 from 'bs58';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 200;
const CHUNK_SIZE = 8;

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

const adminPublicKey = new PublicKey(process.env.ADMIN_WALLET_PUBLIC_KEY!);

// 키 일치 여부 확인
if (!adminPublicKey.equals(adminKeypair.publicKey)) {
  throw new Error('Admin wallet public key mismatch with private key');
}

async function createATA(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: Keypair
): Promise<PublicKey> {
  try {
    const ata = await getAssociatedTokenAddress(
      mint,
      owner,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const ataInfo = await connection.getAccountInfo(ata);

    if (!ataInfo) {
      console.log('Creating ATA for:', owner.toBase58());
      console.log('Mint:', mint.toBase58());
      
      const ix = createAssociatedTokenAccountInstruction(
        payer.publicKey,
        ata,
        owner,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction();
      transaction.add(ix);
      transaction.feePayer = payer.publicKey;
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

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

      console.log('ATA created:', ata.toBase58());
      console.log('Creation signature:', signature);
    } else {
      console.log('ATA already exists:', ata.toBase58());
    }

    return ata;
  } catch (error) {
    console.error('Error in createATA:', error);
    throw error;
  }
}

async function processChunk(
  connection: Connection,
  campaign: any,
  recipients: any[],
) {
  try {
    const tokenMint = new PublicKey(campaign.token_address);
    
    // 관리자 ATA 생성/확인
    const adminAta = await createATA(
      connection,
      tokenMint,
      adminPublicKey,
      adminKeypair
    );

    // Transaction 객체 생성
    const transaction = new Transaction();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = adminPublicKey;

    // 각 수신자의 ATA 생성 및 전송 instruction 추가
    for (const recipient of recipients) {
      const recipientPubkey = new PublicKey(recipient.wallet_address);
      
      // 수신자 ATA 생성/확인
      const recipientAta = await createATA(
        connection,
        tokenMint,
        recipientPubkey,
        adminKeypair
      );

      const amount = Math.floor(Number(recipient.amount) * Math.pow(10, 9));
      const transferIx = createTransferInstruction(
        adminAta,
        recipientAta,
        adminPublicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      );
      
      transaction.add(transferIx);
    }

    // 트랜잭션 서명
    transaction.sign(adminKeypair);
    
    // 트랜잭션 전송 및 확인
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      }
    );

    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
    }

    return signature;

  } catch (error) {
    console.error('Chunk processing error:', error);
    throw error;
  }
}

async function processAirdrop(
  solanaConnection: Connection,
  campaign: any,
  campaignId: string
) {
  const pool = getPool();
  let dbConnection = null;

  try {
    dbConnection = await pool.getConnection();

    // 토큰 mint 주소 유효성 검증
    const tokenMint = new PublicKey(campaign.token_address);
    const mintInfo = await solanaConnection.getAccountInfo(tokenMint);
    
    if (!mintInfo) {
      throw new Error('Invalid token mint address');
    }

    console.log('Token mint info:', {
      address: tokenMint.toBase58(),
      owner: mintInfo.owner.toBase58(),
    });

    const adminAta = await getAssociatedTokenAddress(
      tokenMint,
      adminPublicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // 토큰 잔액 확인
    try {
      const balance = await solanaConnection.getTokenAccountBalance(adminAta);
      const totalRequired = Number(campaign.amount) * campaign.total_recipients;
      
      if (Number(balance.value.amount) < totalRequired) {
        throw new Error('Insufficient token balance in admin wallet');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('could not find account')) {
        await createATA(solanaConnection, tokenMint, adminPublicKey, adminKeypair);
      } else {
        throw error;
      }
    }

    // SOL 잔액 확인
    const solBalance = await solanaConnection.getBalance(adminPublicKey);
    const estimatedFee = 0.000005 * campaign.total_recipients;
    
    if (solBalance / 1e9 < estimatedFee) {
      throw new Error('Insufficient SOL balance for transaction fees');
    }

    // 전체 처리 대상 조회
    const [countResult] = await dbConnection.execute(
      `SELECT COUNT(*) as total 
       FROM airdrop_recipients 
       WHERE campaign_id = ? AND status IN ('PENDING', 'FAILED')`,
      [campaignId]
    );

    const total = countResult[0].total;
    let lastProcessedId = 0;  // 마지막으로 처리된 ID 추적

    // 캠페인 상태 업데이트
    await dbConnection.execute(
      `UPDATE airdrop_campaigns 
       SET status = 'IN_PROGRESS', 
       updated_at = NOW()
       WHERE id = ?`,
      [campaignId]
    );

    console.log(`Starting airdrop for campaign ${campaignId}. Total recipients: ${total}`);

    while (true) {
      // ID 기반 페이징으로 데이터 조회
      const [recipients] = await dbConnection.execute(
        `SELECT * FROM airdrop_recipients 
         WHERE campaign_id = ? 
         AND status IN ('PENDING', 'FAILED')
         AND id > ?
         ORDER BY id ASC 
         LIMIT ?`,
        [campaignId, lastProcessedId, BATCH_SIZE]
      );

      if (recipients.length === 0) {
        console.log('No more recipients to process');
        break;
      }

      console.log(`Processing batch of ${recipients.length} recipients starting from ID ${lastProcessedId + 1}`);

      // CHUNK_SIZE 단위로 처리
      for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
        const chunk = recipients.slice(i, i + CHUNK_SIZE);
        const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
        const totalChunks = Math.ceil(recipients.length / CHUNK_SIZE);

        try {
          console.log(`Processing chunk ${chunkNumber} of ${totalChunks}`);
          
          const signature = await processChunk(
            solanaConnection, 
            campaign, 
            chunk
          );

          // DB 상태 업데이트
          await dbConnection.execute(
            `UPDATE airdrop_recipients 
             SET status = 'COMPLETED', 
             tx_signature = ?, 
             updated_at = NOW()
             WHERE id IN (${chunk.map(() => '?').join(',')})`,
            [signature, ...chunk.map(r => r.id)]
          );

          // 캠페인 완료 수 업데이트
          await dbConnection.execute(
            `UPDATE airdrop_campaigns 
             SET completed_recipients = completed_recipients + ?,
             updated_at = NOW()
             WHERE id = ?`,
            [chunk.length, campaignId]
          );

          console.log(`Chunk processed successfully, signature: ${signature}`);
        } catch (error) {
          console.error(`Error processing chunk:`, error);
          
          // 실패 상태 업데이트
          await dbConnection.execute(
            `UPDATE airdrop_recipients 
             SET status = 'FAILED', 
             error_message = ?, 
             updated_at = NOW()
             WHERE id IN (${chunk.map(() => '?').join(',')})`,
            [String(error), ...chunk.map(r => r.id)]
          );
        }

        // 각 청크 처리 후 대기
        await new Promise(r => setTimeout(r, 2000));
      }

      // 마지막으로 처리된 ID 업데이트
      lastProcessedId = recipients[recipients.length - 1].id;
      
      // 진행 상황 로깅
      const [progressResult] = await dbConnection.execute(
        `SELECT 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
         FROM airdrop_recipients 
         WHERE campaign_id = ?`,
        [campaignId]
      );
      
      console.log(`Progress: ${progressResult[0].completed}/${progressResult[0].total}`);
      console.log(`Completed batch. Last processed ID: ${lastProcessedId}`);
    }

    // 최종 상태 확인 및 업데이트
    const [finalStatus] = await dbConnection.execute(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
       FROM airdrop_recipients 
       WHERE campaign_id = ?`,
      [campaignId]
    );

    const isCompleted = finalStatus[0].total === finalStatus[0].completed;
    
    await dbConnection.execute(
      `UPDATE airdrop_campaigns 
       SET status = ?, 
       updated_at = NOW()
       WHERE id = ?`,
      [isCompleted ? 'COMPLETED' : 'FAILED', campaignId]
    );

    console.log(`Airdrop processing completed. Status: ${isCompleted ? 'COMPLETED' : 'FAILED'}`);

  } catch (error) {
    console.error('Airdrop processing error:', error);
    
    if (dbConnection) {
      await dbConnection.execute(
        `UPDATE airdrop_campaigns 
         SET status = 'FAILED', 
         updated_at = NOW()
         WHERE id = ?`,
        [campaignId]
      );
    }
    
    throw error;
  } finally {
    if (dbConnection) dbConnection.release();
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const pool = getPool();
  let connection = null;

  try {
    const network = process.env.NEXT_PUBLIC_NETWORK;
    if (network !== 'mainnet-beta' && network !== 'devnet') {
      throw new Error('Invalid network configuration');
    }

    const rpcUrl = getRpcUrl(network);
    if (!rpcUrl) {
      throw new Error('RPC URL not configured');
    }

    const solanaConnection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 120000
    });

    connection = await pool.getConnection();

    const [campaignRows] = await connection.execute(
      'SELECT * FROM airdrop_campaigns WHERE id = ?',
      [params.campaignId]
    );

    if (!campaignRows.length) {
      return NextResponse.json(
        { message: '캠페인을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const campaign = campaignRows[0];
    if (campaign.status === 'COMPLETED') {
      return NextResponse.json(
        { message: '이미 완료된 캠페인입니다.' },
        { status: 400 }
      );
    }

    //백그라운드에서 에어드랍 실행
    processAirdrop(solanaConnection, campaign, params.campaignId).catch(console.error);

    return NextResponse.json({ 
      message: '에어드랍이 시작되었습니다.',
      adminPublicKey: adminPublicKey.toString(),
      network: network
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '에어드랍 실행 중 오류가 발생했습니다.', error: String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}