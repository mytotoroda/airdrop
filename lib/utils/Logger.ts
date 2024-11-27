// lib/utils/logger.ts

export class AppLogger {
  private prefix: string;

  constructor(prefix: string = 'App') {
    this.prefix = prefix;
  }

  debug(message: string, ...args: any[]) {
    console.debug(`[${this.prefix}] 🔍 ${message}`, ...args);
  }

  info(message: string, ...args: any[]) {
    console.log(`[${this.prefix}] ℹ️ ${message}`, ...args);
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[${this.prefix}] ⚠️ ${message}`, ...args);
  }

  error(message: string, ...args: any[]) {
    console.error(`[${this.prefix}] ❌ ${message}`, ...args);
  }

  success(message: string, ...args: any[]) {
    console.log(`[${this.prefix}] ✅ ${message}`, ...args);
  }
}

// 전역 로거 인스턴스 생성
export const logger = {
  raydium: new AppLogger('Raydium'),
  swap: new AppLogger('Swap'),
  test: new AppLogger('Test')
};