// components/mmt/raydium/TokenSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';

import { 
  SUPPORTED_TOKENS, 
  getValidPairs 
} from '@/lib/mmt/constants/raydium';

import { 
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  InputAdornment,
  IconButton,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Search, X, Info } from 'lucide-react';
import { TokenInfo } from '@/types/mmt/pool';
import { getTokenIcon } from '@/utils/tokenIcons';

interface TokenSelectorProps {
  onSelect: (token: TokenInfo) => void;
  selectedToken?: TokenInfo;
  otherToken?: TokenInfo;
  label?: string;
  disabled?: boolean;
}

export default function TokenSelector({ 
  onSelect, 
  selectedToken, 
  otherToken,
  label = 'Select Token',
  disabled = false 
}: TokenSelectorProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 토큰 목록 정렬
  const sortTokens = (tokenList: TokenInfo[]): TokenInfo[] => {
    return [...tokenList].sort((a, b) => {
      // 메이저 토큰 우선 정렬
      const majorTokens = ['SOL', 'USDC', 'USDT'];
      const aIsMajor = majorTokens.includes(a.symbol);
      const bIsMajor = majorTokens.includes(b.symbol);
      
      if (aIsMajor && !bIsMajor) return -1;
      if (!aIsMajor && bIsMajor) return 1;
      
      // 그 외는 알파벳 순
      return a.symbol.localeCompare(b.symbol);
    });
  };

  const loadTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/mmt/tokens');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to load tokens');
      }

      if (!Array.isArray(result.data)) {
        throw new Error('Invalid token data format');
      }

      const validTokens = result.data
        .filter(item => 
          item &&
          typeof item.address === 'string' &&
          typeof item.symbol === 'string' &&
          typeof item.name === 'string'
        )
        .map(token => ({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: Number(token.decimals),
          logoURI: token.logoURI || null
        }));

      setTokens(sortTokens(validTokens));

    } catch (error) {
      console.error('Error loading tokens:', error);
      setError(error instanceof Error ? error.message : 'Failed to load tokens');
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadTokens();
    }
  }, [open]);

 // TokenSelector 사용 시
const filteredTokens = React.useMemo(() => {
  if (!search && !otherToken) {
    // 처음 토큰 선택 시 모든 지원 토큰 표시
    return Object.values(SUPPORTED_TOKENS);
  }

  if (!search && otherToken) {
    // 두 번째 토큰 선택 시 가능한 페어만 표시
    const validPairs = getValidPairs(otherToken.symbol);
    return validPairs.map(symbol => SUPPORTED_TOKENS[symbol]);
  }

  // 검색 시 필터링
  const searchLower = search.toLowerCase().trim();
  const tokenList = otherToken 
    ? getValidPairs(otherToken.symbol).map(symbol => SUPPORTED_TOKENS[symbol])
    : Object.values(SUPPORTED_TOKENS);

  return tokenList.filter(token => 
    token.symbol.toLowerCase().includes(searchLower) ||
    token.name.toLowerCase().includes(searchLower) ||
    token.address.toLowerCase().includes(searchLower)
  );
}, [search, otherToken]);

  const handleOpen = () => {
    if (!disabled) {
      setOpen(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
  };

  const handleSelect = (token: TokenInfo) => {
    onSelect(token);
    handleClose();
  };

  const renderTokenButton = () => (
    <Box
      onClick={handleOpen}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        border: 1,
        borderColor: disabled 
          ? theme.palette.action.disabled 
          : theme.palette.divider,
        borderRadius: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        '&:hover': {
          bgcolor: disabled ? 'transparent' : theme.palette.action.hover,
        },
      }}
    >
      {selectedToken ? (
        <>
          <Avatar
            src={getTokenIcon(selectedToken)}
            alt={selectedToken.symbol}
            sx={{ width: 24, height: 24 }}
          >
            {selectedToken.symbol?.[0] || '?'}
          </Avatar>
          <Typography>{selectedToken.symbol || 'Unknown'}</Typography>
          {selectedToken.name && (
            <Tooltip title={selectedToken.name}>
              <Info size={16} />
            </Tooltip>
          )}
        </>
      ) : (
        <Typography color="textSecondary">{label}</Typography>
      )}
    </Box>
  );

  return (
    <>
      {renderTokenButton()}

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        aria-labelledby="token-selector-title"
      >
        <DialogTitle id="token-selector-title">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            Select Token
            <IconButton 
              onClick={handleClose}
              size="small"
              sx={{ ml: 'auto' }}
              aria-label="Close dialog"
            >
              <X />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            placeholder="Search by name, symbol, or address"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              ),
            }}
          />

          <List sx={{ 
            maxHeight: 400, 
            overflow: 'auto',
            '& .MuiListItem-root': {
              transition: 'background-color 0.2s',
            }
          }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : filteredTokens.length === 0 ? (
              <ListItem>
                <ListItemText 
                  primary={tokens.length === 0 ? "No tokens available" : "No matching tokens"}
                  secondary={tokens.length === 0 ? "Please try again later" : "Try a different search term"}
                />
              </ListItem>
            ) : (
              filteredTokens.map((token) => (
                <ListItem
  key={token.address}
  component="div" // button 대신 div 사용
  sx={{
    cursor: 'pointer',
    borderRadius: 1,
    mb: 0.5,
    '&:hover': {
      bgcolor: theme.palette.action.hover,
    },
  }}
  onClick={() => {
    onSelect(token);
    handleClose();
  }}
>
  <ListItemAvatar>
    <Avatar
      src={getTokenIcon(token)}
      alt={token.symbol}
    >
      {token.symbol?.[0] || '?'}
    </Avatar>
  </ListItemAvatar>
  <ListItemText
    primary={token.symbol || 'Unknown Token'}
    secondary={token.name || token.address}
  />
</ListItem>
              ))
            )}
          </List>
        </DialogContent>
      </Dialog>
    </>
  );
}