// app/api/analytics/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    connection = await pool.getConnection();
    
    // 기본 통계 데이터 조회
    const [dailyStats] = await connection.query(
      `SELECT 
        page_path,
        visit_date,
        total_visits,
        unique_visitors
       FROM page_visit_stats
       WHERE visit_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
       ORDER BY visit_date DESC, total_visits DESC`
    );

    // 전체 요약 통계 조회 (선택적)
    const [summary] = await connection.query(
      `SELECT 
        COUNT(DISTINCT page_path) as total_pages,
        SUM(total_visits) as total_visits,
        SUM(unique_visitors) as total_unique_visitors,
        MAX(visit_date) as last_visit_date
       FROM page_visit_stats
       WHERE visit_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)`
    );

    return NextResponse.json({ 
      success: true, 
      stats: dailyStats,
      summary: summary[0]  // 요약 데이터 추가
    });

  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    return NextResponse.json(
      { success: false, message: '통계 데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}