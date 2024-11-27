// lib/amm/raydium.ts
import { 
  Connection, 
  Keypair, 
  PublicKey,
} from '@solana/web3.js';
import { 
  Raydium,
  TxVersion,
  parseTokenAccountResp,
  Logger
} from '@raydium-io/raydium-sdk-v2';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';


export class RaydiumService {
  private connection: Connection;
  private sdk: Raydium | undefined;
  private isMainnet: boolean;
  private owner: Keypair | null = null;
  
  constructor() {
    this.isMainnet = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta';
    const rpcUrl = this.isMainnet 
      ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL 
      : process.env.NEXT_PUBLIC_DEVNET_RPC_URL;
      
    if (!rpcUrl) {
      throw new Error('RPC URL not configured');
    }

    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async initializeSdk(secretKey?: string) {
    try {
      if (secretKey) {
        this.owner = Keypair.fromSecretKey(bs58.decode(secretKey));
      }

      if (this.sdk) return this.sdk;

      this.sdk = await Raydium.load({
        connection: this.connection,
        owner: this.owner || undefined,
        cluster: this.isMainnet ? 'mainnet' : 'devnet',
        disableFeatureCheck: true,
        blockhashCommitment: 'finalized'
      });

      if (this.owner) {
        await this.setupTokenAccountListener();
      }

      console.log('SDK initialized successfully');
      return this.sdk;

    } catch (error) {
      console.error('Failed to initialize Raydium SDK:', error);
      throw error;
    }
  }

  private async setupTokenAccountListener() {
    if (!this.owner) return;

    const updateTokenAccounts = async () => {
      try {
        const tokenAccountData = await this.fetchTokenAccountData();
        this.sdk?.account.updateTokenAccount(tokenAccountData);
        console.debug('Token accounts updated');
      } catch (error) {
        console.error('Failed to update token accounts:', error);
      }
    };

    await updateTokenAccounts();

    this.connection.onAccountChange(this.owner.publicKey, async () => {
      await updateTokenAccounts();
    });
  }

  private async fetchTokenAccountData() {
    if (!this.owner) throw new Error('Owner not initialized');

    try {
      const solAccountResp = await this.connection.getAccountInfo(this.owner.publicKey);
      const tokenAccountResp = await this.connection.getTokenAccountsByOwner(
        this.owner.publicKey, 
        { programId: TOKEN_PROGRAM_ID }
      );
      const token2022Resp = await this.connection.getTokenAccountsByOwner(
        this.owner.publicKey, 
        { programId: TOKEN_2022_PROGRAM_ID }
      );

      return parseTokenAccountResp({
        owner: this.owner.publicKey,
        solAccountResp,
        tokenAccountResp: {
          context: tokenAccountResp.context,
          value: [...tokenAccountResp.value, ...token2022Resp.value],
        },
      });
    } catch (error) {
      console.error('Failed to fetch token account data:', error);
      throw error;
    }
  }

  async getTokenAccounts(walletAddress: string) {
    try {
      const publicKey = new PublicKey(walletAddress);
      const response = await this.connection.getTokenAccountsByOwner(
        publicKey, 
        { programId: TOKEN_PROGRAM_ID }
      );

      return response.value.map(({ pubkey, account }) => ({
        pubkey,
        accountInfo: account
      }));
    } catch (error) {
      console.error('Failed to fetch token accounts:', error);
      return [];
    }
  }

  getTxVersion(): TxVersion {
    return TxVersion.V0;
  }

  getConnection(): Connection {
    return this.connection;
  }
}

export const raydiumService = new RaydiumService();