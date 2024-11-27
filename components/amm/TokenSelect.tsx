'use client';

import React, { useState } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  InputAdornment,
  Typography,
  Box,
  IconButton,
  Divider,
  ThemeProvider,
  CssBaseline
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import { useAppTheme } from '@/hooks/useAppTheme';

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  balance?: number;
  logoURI?: string;
}

interface TokenSelectProps {
  label: string;
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
}

export default function TokenSelect({ label, selectedToken, onSelect }: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useAppTheme();

  // TODO: Replace with actual token list
  const tokens: Token[] = [
    { 
      address: '...', 
      symbol: 'SOL', 
      decimals: 9,
      balance: 1.234,
      logoURI: '/solana-logo.png'
    },
    { 
      address: '...', 
      symbol: 'USDC', 
      decimals: 6,
      balance: 100.50,
      logoURI: '/usdc-logo.png'
    },
  ];

  const filteredTokens = tokens.filter(token =>
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
  };

  const handleSelect = (token: Token) => {
    onSelect(token);
    handleClose();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Button
        onClick={handleOpen}
        sx={{
          minWidth: 100,
          height: 36,
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          color: 'text.primary',
          textTransform: 'none',
          '&:hover': {
            bgcolor: theme.palette.primary.main + '1A', // 10% opacity
            borderColor: 'primary.main',
          },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
        }}
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: '1rem' }} />}
      >
        {selectedToken ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Avatar 
              src={selectedToken.logoURI}
              sx={{ width: 20, height: 20 }}
            >
              {selectedToken.symbol[0]}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {selectedToken.symbol}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            토큰
          </Typography>
        )}
      </Button>

      <Dialog 
        open={open} 
        onClose={handleClose}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
            backgroundImage: 'none',
          }
        }}
      >
        <DialogTitle sx={{ 
          px: 2, 
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h6">
            {label}에 사용할 토큰 선택
          </Typography>
          <IconButton 
            onClick={handleClose}
            size="small"
            sx={{ 
              color: 'text.secondary',
              '&:hover': {
                color: 'text.primary',
                bgcolor: theme.palette.primary.main + '1A',
              }
            }}
          >
            <CloseIcon sx={{ fontSize: '1rem' }} />
          </IconButton>
        </DialogTitle>
        
        <Divider />
        
        <DialogContent sx={{ p: 2 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="토큰 이름 또는 주소 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.default',
                fontSize: '0.875rem',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.light',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />

          <List sx={{ 
            maxHeight: 300, 
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '0.3em'
            },
            '&::-webkit-scrollbar-track': {
              background: theme.palette.primary.main + '1A'
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.primary.main + '33',
              '&:hover': {
                backgroundColor: theme.palette.primary.main + '4D'
              }
            }
          }}>
            {filteredTokens.map((token) => (
              <ListItemButton 
                key={token.address}
                onClick={() => handleSelect(token)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  py: 1,
                  '&:hover': {
                    bgcolor: theme.palette.primary.main + '1A',
                  }
                }}
              >
                <ListItemAvatar>
                  <Avatar 
                    src={token.logoURI}
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: theme.palette.primary.main + '1A',
                      color: 'primary.main'
                    }}
                  >
                    {token.symbol[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {token.symbol}
                    </Typography>
                  }
                  secondary={
                    token.balance !== undefined && (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        잔액: {token.balance.toLocaleString()}
                      </Typography>
                    )
                  }
                  sx={{ my: 0 }}
                />
                {selectedToken?.address === token.address && (
                  <Box 
                    sx={{ 
                      ml: 1,
                      color: 'primary.main',
                      fontWeight: 600 
                    }}
                  >
                    ✓
                  </Box>
                )}
              </ListItemButton>
            ))}
            {filteredTokens.length === 0 && (
              <Box sx={{ 
                py: 3, 
                textAlign: 'center',
                color: 'text.secondary'
              }}>
                <Typography variant="body1">
                  검색 결과가 없습니다
                </Typography>
              </Box>
            )}
          </List>
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}