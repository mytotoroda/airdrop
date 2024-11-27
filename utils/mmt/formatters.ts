import { Pool, TokenInfo } from '@/types/mmt/pool';

/**
 * 토큰 페어 심볼을 포맷팅합니다. (예: "SOL/USDC")
 */
export const formatTokenPair = (tokenA: TokenInfo, tokenB: TokenInfo): string => {
  return `${tokenA.symbol}/${tokenB.symbol}`;
};

/**
 * 풀 상태를 한글로 변환합니다.
 */
export const formatPoolStatus = (status: Pool['status']): string => {
  const statusMap = {
    ACTIVE: '활성',
    PAUSED: '일시중지',
    INACTIVE: '비활성'
  };
  return statusMap[status];
};

/**
 * 숫자를 읽기 쉬운 형식으로 포맷팅합니다.
 * null, undefined, 유효하지 않은 입력값은 'N/A'를 반환합니다.
 * 1000 이상의 값은 K, 1,000,000 이상의 값은 M 단위로 표시됩니다.
 * 
 * @param value - 포맷팅할 숫자 (number, string, 또는 decimal 타입)
 * @returns 포맷팅된 문자열
 * 
 * @example
 * formatNumber(1234567) // "1.23M"
 * formatNumber(1234) // "1.23K"
 * formatNumber(123) // "123.00"
 * formatNumber(null) // "N/A"
 * formatNumber("invalid") // "N/A"
 */
export function formatNumber(value: number | string | null | undefined): string {
  // null, undefined 체크
  if (value == null) return 'N/A';
  
  // 문자열을 숫자로 변환
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // 유효한 숫자인지 확인
  if (isNaN(numValue)) return 'N/A';
  
  // 값의 범위에 따라 적절한 포맷 적용
  if (numValue >= 1_000_000) {
    return `${(numValue / 1_000_000).toFixed(2)}M`;
  }
  if (numValue >= 1_000) {
    return `${(numValue / 1_000).toFixed(2)}K`;
  }
  return numValue.toFixed(2);
}

/**
 * 금액을 통화 형식으로 포맷팅합니다.
 * @param amount - 포맷팅할 금액
 * @param currency - 통화 단위 (기본값: 'USD')
 */
export function formatCurrency(amount: number | string | null | undefined, currency: string = 'USD'): string {
  if (amount == null) return 'N/A';
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return 'N/A';
  
  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return 'N/A';
  }
}

/**
 * 퍼센트 값을 포맷팅합니다.
 * @param value - 포맷팅할 값 (0.01 = 1%)
 * @param decimals - 소수점 자릿수 (기본값: 2)
 */
export function formatPercent(value: number | string | null | undefined, decimals: number = 2): string {
  if (value == null) return 'N/A';
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return 'N/A';
  
  return `${(numValue * 100).toFixed(decimals)}%`;
}