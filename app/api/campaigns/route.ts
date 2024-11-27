// app/api/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mysql, { Pool, PoolConnection } from 'mysql2/promise';

let pool: Pool;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      connectionLimit: 10,
    });
  }
  return pool;
}


export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - 캠페인 목록 조회
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  const offset = (page - 1) * limit;
  
  const pool = getPool();
  let connection: PoolConnection | null = null;
  
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT * FROM airdrop_campaigns 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const [totalRows] = await connection.execute(
      'SELECT COUNT(*) as count FROM airdrop_campaigns'
    );

    const response = NextResponse.json({
      data: rows,
      pagination: {
        page,
        limit,
        total: (totalRows as any)[0].count
      }
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Error fetching campaigns', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// POST - 새 캠페인 생성
export async function POST(request: NextRequest) {
  const pool = getPool();
  let connection: PoolConnection | null = null;
  
  try {
    const data = await request.json();
    const {
      title,
      token_address,
      token_name,
      token_symbol,
      amount,
      total_recipients,
      creator_wallet
    } = data;

    connection = await pool.getConnection();
    const [result] = await connection.execute(
      `INSERT INTO airdrop_campaigns (
        title,
        token_address,
        token_name,
        token_symbol,
        amount,
        total_recipients,
        creator_wallet
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, token_address, token_name, token_symbol, amount, total_recipients, creator_wallet]
    );

    return NextResponse.json({ 
      message: 'Campaign created successfully',
      id: (result as any).insertId 
    }, { status: 201 });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { message: 'Error creating campaign', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}