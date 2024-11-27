// utils/solana.ts

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SafeEventEmitterProvider } from '@web3auth/base';

export class SolanaWallet {
  private provider: SafeEventEmitterProvider;
  private connection: Connection;

  constructor(provider: SafeEventEmitterProvider) {
    this.provider = provider;
    const rpcUrl = process.env.NEXT_PUBLIC_NETWORK === 'mainnet-beta'
      ? process.env.NEXT_PUBLIC_MAINNET_RPC_URL!
      : 'https://api.devnet.solana.com';
    
    this.connection = new Connection(rpcUrl);
  }

  async getAccounts(): Promise<string[]> {
    try {
      const accounts = await this.provider.request<string[]>({ method: "getAccounts" });
      return accounts || [];
    } catch (error) {
      console.error("Error getting accounts:", error);
      return [];
    }
  }

  async getBalance(): Promise<number> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts[0]) throw new Error("No account found");
      
      const publicKey = new PublicKey(accounts[0]);
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error("Error getting balance:", error);
      return 0;
    }
  }

  async signAndSendTransaction(transaction: any): Promise<string> {
    try {
      const signedTx = await this.provider.request({
        method: "signAndSendTransaction",
        params: { transaction },
      });
      return signedTx as string;
    } catch (error) {
      console.error("Error signing transaction:", error);
      throw error;
    }
  }

  async requestAirdrop(): Promise<string | null> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts[0]) throw new Error("No account found");

      const publicKey = new PublicKey(accounts[0]);
      const signature = await this.connection.requestAirdrop(
        publicKey,
        LAMPORTS_PER_SOL // 1 SOL
      );

      await this.connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error("Error requesting airdrop:", error);
      return null;
    }
  }
}