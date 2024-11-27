// lib/logger.ts
export class AppLogger {
  private prefix: string;

  constructor(prefix: string = 'App') {
    this.prefix = prefix;
  }

  debug(message: string, data?: any) {
    console.debug(`[${this.prefix}] 🔍 ${message}`, data ? data : '');
  }

  info(message: string, data?: any) {
    console.log(`[${this.prefix}] ℹ️ ${message}`, data ? data : '');
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.prefix}] ⚠️ ${message}`, data ? data : '');
  }

  error(message: string, error?: any) {
    console.error(`[${this.prefix}] ❌ ${message}`, error ? error : '');
  }

  success(message: string, data?: any) {
    console.log(`[${this.prefix}] ✅ ${message}`, data ? data : '');
  }
}