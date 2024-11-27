// app/api/analytics/page-visit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection = null;

  try {
    const { 
      pagePath,
      visitorIp,
      userAgent,
      referer 
    } = await request.json();

    const visitDate = new Date().toISOString().split('T')[0];

    connection = await pool.getConnection();
    
    // 방문 기록 저장
    await connection.query(
      `INSERT INTO page_visits 
       (page_path, visitor_ip, user_agent, referrer, visit_date) 
       VALUES (?, ?, ?, ?, ?)`,
      [pagePath, visitorIp, userAgent, referer, visitDate]
    );

    // 이전 방문 확인
    const [prevVisits] = await connection.query(
      `SELECT COUNT(*) as count 
       FROM page_visits 
       WHERE page_path = ? 
       AND visit_date = ? 
       AND visitor_ip = ? 
       AND id < LAST_INSERT_ID()`,
      [pagePath, visitDate, visitorIp]
    );

    const isNewVisitor = prevVisits[0].count === 0;

    // 일별 통계 업데이트
    await connection.query(
      `INSERT INTO page_visit_stats 
       (page_path, visit_date, total_visits, unique_visitors) 
       VALUES (?, ?, 1, 1) 
       ON DUPLICATE KEY UPDATE 
       total_visits = total_visits + 1,
       unique_visitors = unique_visitors + ?`,
      [
        pagePath, 
        visitDate,
        isNewVisitor ? 1 : 0
      ]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error recording page visit:', error);
    return NextResponse.json(
      { success: false, message: '방문 기록 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}