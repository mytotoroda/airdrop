// app/api/mmt/analysis/profitability/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { PoolConnection } from 'mysql2/promise';

export const dynamic = 'force-dynamic';

interface QueryError extends Error {
 code?: string;
 sqlMessage?: string;
 sql?: string;
}

async function executeQuery(
 connection: PoolConnection, 
 sql: string, 
 params: any[],
 queryName: string
) {
 try {
   // 실제 바인딩된 쿼리문 생성 (디버깅용)
   const debugSql = sql.replace(/\?/g, (match, i) => {
     const param = params[i];
     if (typeof param === 'string') return `'${param}'`;
     if (param === null) return 'NULL';
     return param;
   });

   // 쿼리 실행 전 로깅
   /*
   console.log(`[${queryName}] Executing Query:`, {
     rawSql: sql,
     debugSql,
     params,
     timestamp: new Date().toISOString()
   });
   */

   const [result] = await connection.query(sql, params);
   
   // 쿼리 실행 결과 로깅
   /*
   console.log(`[${queryName}] Success:`, {
     params,
     resultCount: Array.isArray(result) ? result.length : 1,
     sampleData: Array.isArray(result) && result.length > 0 ? result[0] : result,
     executedQuery: debugSql
   });
   */

   return result;
 } catch (error) {
   const queryError = error as QueryError;
   console.error(`[${queryName}] Error:`, {
     code: queryError.code,
     message: queryError.message,
     sqlMessage: queryError.sqlMessage,
     rawSql: sql,
     debugSql: sql.replace(/\?/g, (match, i) => {
       const param = params[i];
       if (typeof param === 'string') return `'${param}'`;
       if (param === null) return 'NULL';
       return param;
     }),
     params,
     timestamp: new Date().toISOString()
   });
   throw error;
 }
}

export async function GET(
 request: NextRequest,
 { params }: { params: { id: string } }
) {

/*
 console.log('[Profitability Analysis] Started for poolId:', params.id, {
   timestamp: new Date().toISOString(),
   poolIdType: typeof params.id
 });
 */
 
 const pool = getPool();
 let connection = null;

 try {
   //console.log('[DB Connection] Attempting to get connection...');
   connection = await pool.getConnection();
   //console.log('[DB Connection] Successfully connected');

   // poolId 변환 및 로깅
   const poolId = parseInt(params.id, 10);
   /*
   console.log('[Pool ID Conversion]', {
     original: params.id,
     converted: poolId,
     isValid: !isNaN(poolId)
   });
   */

   if (isNaN(poolId)) {
     return NextResponse.json(
       { 
         success: false, 
         message: '유효하지 않은 풀 ID입니다.' 
       },
       { status: 400 }
     );
   }

   // 현재 포지션 데이터 조회
   const currentPosition = await executeQuery(
     connection,
     `SELECT * FROM mmt_pos_current WHERE pool_id = ?`,
     [poolId],
     'Current Position Query'
   );

   // 히스토리 데이터 조회 (최근 30일)
   const positionHistory = await executeQuery(
     connection,
     `SELECT 
       ps.*,
       COALESCE(
         (SELECT SUM(fees_earned_24h)
          FROM mmt_pos_snapshots
          WHERE pool_id = ps.pool_id
          AND timestamp <= ps.timestamp
         ), 0
       ) as accumulated_fees
     FROM mmt_pos_snapshots ps
     WHERE pool_id = ?
     AND timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     ORDER BY timestamp ASC`,
     [poolId],
     'Position History Query'
   );

   // 리밸런싱 비용 계산
   const rebalancingCosts = await executeQuery(
     connection,
     `SELECT COALESCE(SUM(total_cost_usd), 0) as total_costs
      FROM mmt_pos_rebalance_history
      WHERE pool_id = ? AND status = 'COMPLETED'`,
     [poolId],
     'Rebalancing Costs Query'
   );

   // 데이터 검증 로그
   /*
   console.log('[Data Validation]', {
     poolId,
     currentPositionFound: currentPosition.length > 0,
     historyEntriesCount: positionHistory.length,
     hasRebalancingCosts: rebalancingCosts.length > 0,
     sampleCurrentPosition: currentPosition[0],
     sampleHistory: positionHistory[0],
     rebalancingCostsResult: rebalancingCosts[0]
   });
   */

   // 수익성 지표 계산
   const position = currentPosition[0] || {};
   const initialInvestment = position.initial_investment_usd || 0;
   const currentValue = position.total_value_usd || 0;
   const totalFees = position.fees_earned_usd || 0;
   const totalROI = initialInvestment > 0 
     ? ((currentValue - initialInvestment) / initialInvestment) * 100 
     : 0;

   //console.log('[Calculated Metrics]', {
   //  poolId,
   //  initialInvestment,
   //  currentValue,
   //  totalFees,
    // totalROI,
    // position
  // });

   // ROI 계산
   let dailyROI = 0;
   let weeklyROI = 0;
   let monthlyROI = 0;

   if (positionHistory.length > 1) {
     const latest = positionHistory[positionHistory.length - 1];
     const dayAgo = positionHistory.find(h => 
       new Date(h.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
     );
     const weekAgo = positionHistory.find(h => 
       new Date(h.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
     );
     const monthAgo = positionHistory[0];

/*
     console.log('[ROI Calculation Data]', {
       poolId,
       hasLatest: !!latest,
       hasDayAgo: !!dayAgo,
       hasWeekAgo: !!weekAgo,
       hasMonthAgo: !!monthAgo,
       latestValue: latest?.total_value_usd,
       dayAgoValue: dayAgo?.total_value_usd,
       weekAgoValue: weekAgo?.total_value_usd,
       monthAgoValue: monthAgo?.total_value_usd
     });
*/

     if (dayAgo) {
       dailyROI = ((latest.total_value_usd - dayAgo.total_value_usd) / dayAgo.total_value_usd) * 100;
     }
     if (weekAgo) {
       weeklyROI = ((latest.total_value_usd - weekAgo.total_value_usd) / weekAgo.total_value_usd) * 100;
     }
     if (monthAgo) {
       monthlyROI = ((latest.total_value_usd - monthAgo.total_value_usd) / monthAgo.total_value_usd) * 100;
     }
   }

   // 수익 히스토리 데이터 포맷팅
   const profitHistory = positionHistory.map(snapshot => ({
     timestamp: new Date(snapshot.timestamp).toLocaleString(),
     value: Number(snapshot.total_value_usd),
     fees: Number(snapshot.accumulated_fees)
   }));

   /*
   console.log('[Response Data]', {
     poolId,
     historyEntries: profitHistory.length,
     dateRange: profitHistory.length > 0 ? {
       first: profitHistory[0].timestamp,
       last: profitHistory[profitHistory.length - 1].timestamp
     } : null,
     calculatedROIs: {
       dailyROI,
       weeklyROI,
       monthlyROI,
       totalROI
     }
   });
   */

   return NextResponse.json({
     success: true,
     data: {
       dailyROI,
       weeklyROI,
       monthlyROI,
       totalROI,
       initialInvestment: Number(initialInvestment),
       currentValue: Number(currentValue),
       totalFees: Number(totalFees),
       rebalancingCosts: Number(rebalancingCosts[0]?.total_costs || 0),
       netProfit: currentValue - initialInvestment + totalFees,
       profitHistory
     }
   });

 } catch (error) {
   const err = error as QueryError;
   console.error('[Fatal Error]', {
     name: err.name,
     message: err.message,
     code: err.code,
     sqlMessage: err.sqlMessage,
     stack: err.stack,
     poolId: params.id,
     timestamp: new Date().toISOString()
   });

   return NextResponse.json(
     { 
       success: false, 
       message: '수익성 분석 데이터를 불러오는데 실패했습니다.',
       error: {
         code: err.code,
         message: process.env.NODE_ENV === 'development' ? err.message : '서버 오류가 발생했습니다.'
       }
     },
     { status: 500 }
   );

 } finally {
   if (connection) {
     try {
       connection.release();
       console.log('[DB Connection] Successfully released');
     } catch (releaseError) {
       console.error('[DB Connection] Error releasing connection:', releaseError);
     }
   }
 }
}