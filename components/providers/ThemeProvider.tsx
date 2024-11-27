// components/providers/ThemeProvider.tsx
'use client';

import { ThemeProvider as MuiThemeProvider } from '@mui/material';
import { useAppTheme } from '@/hooks/useAppTheme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();

  return (
    <MuiThemeProvider theme={theme}>
      {children}
    </MuiThemeProvider>
  );
}