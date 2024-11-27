// utils/tokenIcons.tsx
import React, { useState } from 'react';

export const TOKEN_ICON_BASE_URL = '/tokens';

// 이미지 경로를 반환하는 유틸리티 함수
export function getTokenIconUrl(symbol: string): string {
  if (!symbol) return `${TOKEN_ICON_BASE_URL}/unknown.png`;
  return `${TOKEN_ICON_BASE_URL}/${symbol.toLowerCase()}.png`;
}

// TokenInfo 타입에 대한 아이콘 헬퍼 함수
export function getTokenIcon(token: { symbol: string, logoURI?: string | null }): string {
  if (!token?.symbol) return `${TOKEN_ICON_BASE_URL}/unknown.png`;
  
  // logoURI가 있고 http로 시작하는 경우 외부 URL 사용
  if (token.logoURI?.startsWith('http')) {
    return token.logoURI;
  }
  
  // logoURI가 있고 상대 경로인 경우 그대로 사용
  if (token.logoURI && !token.logoURI.startsWith('http')) {
    return token.logoURI;
  }
  
  // 그 외의 경우 기본 경로 사용
  return getTokenIconUrl(token.symbol);
}

// 토큰 아이콘 컴포넌트
export const TokenIcon: React.FC<{
  symbol: string;
  size?: number;
  className?: string;
}> = ({ symbol, size = 24, className = '' }) => {
  const [error, setError] = useState(false);
  
  return (
    <img
      src={error ? `${TOKEN_ICON_BASE_URL}/unknown.png` : getTokenIconUrl(symbol)}
      alt={`${symbol} icon`}
      width={size}
      height={size}
      className={className}
      style={{ 
        borderRadius: '50%',
        objectFit: 'cover'
      }}
      onError={() => setError(true)}
    />
  );
};