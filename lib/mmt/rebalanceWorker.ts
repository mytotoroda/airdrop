// lib/mmt/rebalanceWorker.ts
import { getPool } from '@/lib/db';
import { raydiumService } from '@/lib/mmt/raydium';
import { calculateRebalanceAction, executeRebalance } from '@/lib/mmt/rebalance';

interface PoolConfig {
  id: number;
  pool_address: string;
  token_a_decimals: number;
  token_b_decimals: number;
  target_ratio: number;
  rebalance_threshold: number;
  min_trade_size: number;
  max_trade_size: number;
  max_slippage: number;
  enabled: boolean;
  emergency_stop: boolean;
}

export class RebalanceWorker {
  private static instance: RebalanceWorker;
  private workerRunning: boolean = false;  // isRunning -> workerRunning으로 변경
  private lastCheckTime: string = '';
  private checkInterval: number = 60000; // 1분

  private constructor() {}

  public static getInstance(): RebalanceWorker {
    if (!RebalanceWorker.instance) {
      RebalanceWorker.instance = new RebalanceWorker();
    }
    return RebalanceWorker.instance;
  }

  public async start() {
    if (this.workerRunning) return;
    this.workerRunning = true;
    this.scheduleNextCheck();
  }

  public stop() {
    this.workerRunning = false;
  }

  // 상태 조회 메서드
  public isRunning(): boolean {
    return this.workerRunning;
  }

  public getLastCheckTime(): string {
    return this.lastCheckTime;
  }

  private async scheduleNextCheck() {
    if (!this.workerRunning) return;

    try {
      await this.checkPools();
    } catch (error) {
      console.error('Pool check error:', error);
    }

    setTimeout(() => this.scheduleNextCheck(), this.checkInterval);
  }

  private async checkPools() {
    this.lastCheckTime = new Date().toISOString();
    const dbPool = getPool();
    let connection = null;

    try {
      connection = await dbPool.getConnection();

      // 활성화된 풀 설정 조회
      const [pools] = await connection.query(
        `SELECT m.*, c.*
         FROM mmt_pools m
         JOIN mmt_pool_configs c ON m.id = c.pool_id
         WHERE m.status = 'ACTIVE' 
         AND c.enabled = true 
         AND c.emergency_stop = false`
      );

      // 각 풀에 대해 리밸런싱 필요 여부 확인
      for (const pool of pools) {
        try {
          await this.checkAndRebalancePool(pool, connection);
        } catch (error) {
          console.error(`Error processing pool ${pool.id}:`, error);
          // 개별 풀 오류는 기록하고 계속 진행
          await connection.query(
            `INSERT INTO mmt_pool_events (pool_id, event_type, description)
             VALUES (?, 'ERROR', ?)`,
            [pool.id, error instanceof Error ? error.message : 'Unknown error']
          );
        }
      }

    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  private async checkAndRebalancePool(pool: PoolConfig, connection: any) {
    // 온체인 풀 상태 확인
    const sdk = await raydiumService.initializeSdk();
    const poolData = await sdk.clmm.getRpcClmmPoolInfos({
      poolIds: [pool.pool_address],
    });

    if (!poolData || !poolData[pool.pool_address]) {
      throw new Error('Pool data not found');
    }

    const poolInfo = poolData[pool.pool_address];

    // 리밸런싱 필요 여부 계산
    const currentRatio = poolInfo.tokenAAmount / poolInfo.tokenBAmount;
    const ratioDiff = Math.abs(currentRatio - pool.target_ratio) / pool.target_ratio;

    if (ratioDiff <= pool.rebalance_threshold) {
      return; // 리밸런싱 불필요
    }

    // 리밸런싱 액션 계산
    const action = await calculateRebalanceAction({
      poolAddress: pool.pool_address,
      targetRatio: pool.target_ratio,
      currentPrice: poolInfo.currentPrice,
      tokenAAmount: poolInfo.tokenAAmount,
      tokenBAmount: poolInfo.tokenBAmount,
      maxSlippage: pool.max_slippage,
      minTradeSize: pool.min_trade_size,
      maxTradeSize: pool.max_trade_size
    });

    if (!action) {
      return; // 실행 가능한 리밸런싱 액션 없음
    }

    // 트랜잭션 시작
    await connection.beginTransaction();

    try {
      // 리밸런싱 실행
      const result = await executeRebalance(sdk, pool.pool_address, action);

      if (!result.success) {
        throw new Error(result.error || 'Rebalance execution failed');
      }

      // 트랜잭션 기록
      await connection.query(
        `INSERT INTO mmt_transactions (
          pool_id, action_type, direction, amount, price, tx_signature, status
        ) VALUES (?, 'REBALANCE', ?, ?, ?, ?, 'SUCCESS')`,
        [
          pool.id,
          action.type,
          action.amount,
          action.expectedPrice,
          result.signature
        ]
      );

      // 이벤트 기록
      await connection.query(
        `INSERT INTO mmt_pool_events (
          pool_id, event_type, description
        ) VALUES (?, 'REBALANCED', ?)`,
        [
          pool.id,
          `Auto rebalance executed: ${action.type} ${action.amount} tokens at ${action.expectedPrice}`
        ]
      );

      await connection.commit();

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  }
}