// lib/mmt/marketMaker.ts
import { Connection, PublicKey } from '@solana/web3.js';
import { RaydiumService } from './raydium';
import { getPool } from '@/lib/db';

interface MMConfig {
  poolId: string;
  bidSpread: number;
  askSpread: number;
  minOrderSize: number;
  maxOrderSize: number;
  minOrderInterval: number;
  maxPositionSize: number;
  autoRebalance: boolean;
  rebalanceThreshold: number;
}

interface MarketStatus {
  baseReserve: number;
  quoteReserve: number;
  price: number;
  liquidity: number;
}

export class MarketMaker {
  private connection: Connection;
  private raydiumService: RaydiumService;
  private isMainnet: boolean;

  constructor(connection: Connection, isMainnet: boolean = true) {
    this.connection = connection;
    this.raydiumService = new RaydiumService(connection, isMainnet);
    this.isMainnet = isMainnet;
  }


//////////////////////////////////////////////////////////////////////////////


  // MM 활성화
  async enable(poolId: string): Promise<boolean> {
  console.log(`Enabling MM for pool ${poolId}`);
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    
    // Lock timeout 설정
    await connection.query('SET innodb_lock_wait_timeout = 50');
    await connection.beginTransaction();

    try {
      // 1. 현재 상태 확인
      const [[currentConfig]] = await connection.query(
        'SELECT enabled FROM mmt_pool_configs WHERE pool_id = ? FOR UPDATE',
        [poolId]
      );

      if (!currentConfig) {
        await connection.query(
          `INSERT INTO mmt_pool_configs (
            pool_id, 
            enabled,
            bid_spread,
            ask_spread,
            min_order_size,
            max_order_size,
            min_order_interval,
            max_position_size,
            auto_rebalance,
            rebalance_threshold
          ) VALUES (?, true, 0.002, 0.002, 0.1, 500, 60, 5000, true, 0.03)`,
          [poolId]
        );
      } else {
        // 2. 상태 업데이트
        await connection.query(
          'UPDATE mmt_pool_configs SET enabled = true WHERE pool_id = ?',
          [poolId]
        );
      }

      // 3. 이벤트 로깅
      await connection.query(
        `INSERT INTO mmt_pool_events (
          pool_id,
          event_type,
          description
        ) VALUES (?, 'ENABLED', ?)`,
        [
          poolId,
          JSON.stringify({
            event: 'MM enabled',
            timestamp: new Date()
          })
        ]
      );

      await connection.commit();
      console.log(`Successfully enabled MM for pool ${poolId}`);
      return true;

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error enabling market maker:', error);
    return false;

  } finally {
    if (connection) {
      try {
        // 세션 설정 복원
        await connection.query('SET innodb_lock_wait_timeout = 50');
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////////

  // MM 비활성화
  async disable(poolId: string): Promise<boolean> {
    console.log(`Disabling MM for pool ${poolId}`);
    const pool = getPool();
    let connection = null;

    try {
      connection = await pool.getConnection();
      
      // DB 상태 업데이트
      await connection.query(
        'UPDATE mmt_pool_configs SET enabled = ? WHERE pool_id = ?',
        [false, poolId]
      );

      // 이벤트 로깅
      await connection.query(
        `INSERT INTO mmt_pool_events (
          pool_id,
          event_type,
          description
        ) VALUES (?, 'DISABLED', ?)`,
        [
          poolId,
          JSON.stringify({
            event: 'MM disabled',
            timestamp: new Date()
          })
        ]
      );

      return true;

    } catch (error) {
      console.error('Error disabling market maker:', error);
      return false;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // MM 단일 실행
  async executeOnce(poolId: string): Promise<any> {
    const config = await this.getConfig(poolId);
    if (!config) {
      throw new Error('MM configuration not found');
    }

    // 활성화 상태 확인
    if (!await this.isActive(poolId)) {
      throw new Error('MM is not enabled for this pool');
    }

    try {
      // 1. 시장 상태 확인
      const marketStatus = await this.getMarketStatus(poolId);
      if (!marketStatus) {
        throw new Error('Failed to get market status');
      }

      // 2. 주문 크기 계산
      const orderSize = this.calculateOrderSize(
        config.minOrderSize,
        config.maxOrderSize,
        marketStatus.baseReserve
      );

      // 3. 가격 계산
      const { bidPrice, askPrice } = this.calculatePrices(
        marketStatus.price,
        config.bidSpread,
        config.askSpread
      );

      // 4. 포지션 체크
      const currentPosition = await this.getCurrentPosition(poolId);
      
      // 5. 리밸런싱 체크
      if (currentPosition > config.maxPositionSize && config.autoRebalance) {
        await this.rebalancePosition(config);
        return {
          action: 'rebalanced',
          timestamp: new Date(),
          position: currentPosition
        };
      }

      // 6. 실행 결과
      const executionInfo = {
        timestamp: new Date(),
        poolId,
        orderSize,
        bidPrice,
        askPrice,
        currentPosition,
        marketStatus
      };

      // 7. 이벤트 로깅
      await this.logMMEvent(
        poolId, 
        'EXECUTION',
        JSON.stringify(executionInfo)
      );

      return executionInfo;

    } catch (error) {
      console.error('Error in MM execution:', error);
      await this.logError(poolId, error);
      throw error;
    }
  }

  // 활성화 상태 확인
  async isActive(poolId: string): Promise<boolean> {
    const pool = getPool();
    let connection = null;
    
    try {
      connection = await pool.getConnection();
      const [[config]] = await connection.query(
        'SELECT enabled FROM mmt_pool_configs WHERE pool_id = ?',
        [poolId]
      );
      return Boolean(config?.enabled);
    } catch (error) {
      console.error('Error checking MM status:', error);
      return false;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // 시장 상태 조회 (mock)
  private async getMarketStatus(poolId: string): Promise<MarketStatus | null> {
    try {
      return {
        baseReserve: 1000000,
        quoteReserve: 1000000,
        price: 1.0,
        liquidity: 1000000
      };
    } catch (error) {
      console.error('Error getting market status:', error);
      return null;
    }
  }

  // 현재 포지션 조회 (mock)
  private async getCurrentPosition(poolId: string): Promise<number> {
    return 0;
  }

  // 포지션 리밸런싱 (mock)
  private async rebalancePosition(config: MMConfig): Promise<void> {
    console.log('Rebalancing position for pool', config.poolId);
  }

  // 주문 크기 계산
  private calculateOrderSize(min: number, max: number, balance: number): number {
    const size = balance * 0.01; // 기본 1%
    console.log('Calculating order size:', { min, max, balance, calculated: size });
    return Math.min(max, Math.max(min, size));
  }

  // 가격 계산
  private calculatePrices(currentPrice: number, bidSpread: number, askSpread: number) {
    const bidPrice = currentPrice * (1 - bidSpread);
    const askPrice = currentPrice * (1 + askSpread);
    console.log('Calculating prices:', { 
      currentPrice, 
      bidSpread, 
      askSpread, 
      bidPrice, 
      askPrice 
    });
    return { bidPrice, askPrice };
  }

  // 이벤트 로깅
  private async logMMEvent(poolId: string, eventType: string, description: string): Promise<void> {
    const pool = getPool();
    let connection = null;

    try {
      connection = await pool.getConnection();
      await connection.query(
        `INSERT INTO mmt_pool_events (
          pool_id,
          event_type,
          description
        ) VALUES (?, ?, ?)`,
        [poolId, eventType, description]
      );
    } catch (error) {
      console.error('Error logging MM event:', error);
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // 에러 로깅
  private async logError(poolId: string, error: any): Promise<void> {
    const pool = getPool();
    let connection = null;

    try {
      connection = await pool.getConnection();
      await connection.query(
        `INSERT INTO mmt_pool_events (
          pool_id,
          event_type,
          description
        ) VALUES (?, 'ERROR', ?)`,
        [
          poolId,
          JSON.stringify({
            error: error.message || 'Unknown error',
            timestamp: new Date()
          })
        ]
      );
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // 상태 조회
  async getStatus(poolId: string): Promise<any> {
    return {
      lastCheck: new Date().toISOString(),
      config: await this.getConfig(poolId),
      isActive: await this.isActive(poolId)
    };
  }

  // 설정 조회
  private async getConfig(poolId: string): Promise<MMConfig | null> {
    const pool = getPool();
    let connection = null;

    try {
      connection = await pool.getConnection();
      const [[dbConfig]] = await connection.query(
        'SELECT * FROM mmt_pool_configs WHERE pool_id = ?',
        [poolId]
      );

      if (!dbConfig) return null;

      return {
        poolId: dbConfig.pool_id,
        bidSpread: Number(dbConfig.bid_spread) || 0.002,
        askSpread: Number(dbConfig.ask_spread) || 0.002,
        minOrderSize: Number(dbConfig.min_order_size) || 0.1,
        maxOrderSize: Number(dbConfig.max_order_size) || 500,
        minOrderInterval: Number(dbConfig.min_order_interval) || 60,
        maxPositionSize: Number(dbConfig.max_position_size) || 5000,
        autoRebalance: Boolean(dbConfig.auto_rebalance),
        rebalanceThreshold: Number(dbConfig.rebalance_threshold) || 0.03
      };
    } catch (error) {
      console.error('Error getting config:', error);
      return null;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}