// components/common/TokenIcon.tsx
'use client';

import React, { useState } from 'react';
import { getTokenIconUrl } from '@/utils/tokenIcons';

interface TokenIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export const TokenIcon: React.FC<TokenIconProps> = ({
  symbol,
  size = 24,
  className = ''
}) => {
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