// lib/db.ts
import mysql, { Pool } from 'mysql2/promise';

let pool: Pool;

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,      // 동시 연결 수 제한
      maxIdle: 10,             // 유휴 상태로 둘 최대 연결 수
      idleTimeout: 60000,      // 유휴 연결 타임아웃 (60초)
      queueLimit: 0,
      enableKeepAlive: true,   // 연결 유지
      keepAliveInitialDelay: 0 // keepAlive 초기 지연
};

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export async function withDbConnection<T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
}