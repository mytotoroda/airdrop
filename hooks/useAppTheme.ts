// hooks/useAppTheme.ts
import { useTheme as useNextTheme } from 'next-themes';
import { createTheme, alpha } from '@mui/material';
import { useMemo } from 'react';

export function useAppTheme() {
  const { resolvedTheme } = useNextTheme();
  
  return useMemo(() => {
    const mode = resolvedTheme === 'dark' ? 'dark' : 'light';
    
    // Telegram color palette
    const colors = {
      primary: '#2AABEE',          // Telegram blue
      secondary: '#229ED9',        // Darker telegram blue
      success: '#31B545',          // Green for success states
      warning: '#FFA900',          // Warning color
      error: '#FF4D4F',           // Error color
      background: {
        light: '#FFFFFF',          // Light mode background
        dark: '#17212B',           // Dark mode background (Telegram desktop dark)
      },
      surface: {
        light: '#F8F9FA',          // Light mode surface
        dark: '#242F3D',           // Dark mode surface
      },
      textPrimary: {
        light: '#232E3C',          // Light mode primary text
        dark: '#FFFFFF',           // Dark mode primary text
      },
      textSecondary: {
        light: '#707991',          // Light mode secondary text
        dark: '#A8B4C1',           // Dark mode secondary text
      }
    };

    const themeConfig = {
      dark: {
        background: {
          default: colors.background.dark,
          paper: colors.surface.dark,
        },
        text: {
          primary: colors.textPrimary.dark,
          secondary: colors.textSecondary.dark,
        },
      },
      light: {
        background: {
          default: colors.background.light,
          paper: colors.surface.light,
        },
        text: {
          primary: colors.textPrimary.light,
          secondary: colors.textSecondary.light,
        },
      },
    };

    return createTheme({
      palette: {
        mode,
        background: themeConfig[mode].background,
        primary: {
          main: colors.primary,
          dark: colors.secondary,
          light: alpha(colors.primary, 0.8),
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: colors.secondary,
          dark: alpha(colors.secondary, 0.8),
          light: alpha(colors.secondary, 0.6),
          contrastText: '#FFFFFF',
        },
        error: {
          main: colors.error,
          dark: alpha(colors.error, 0.8),
          light: alpha(colors.error, 0.6),
        },
        warning: {
          main: colors.warning,
          dark: alpha(colors.warning, 0.8),
          light: alpha(colors.warning, 0.6),
        },
        success: {
          main: colors.success,
          dark: alpha(colors.success, 0.8),
          light: alpha(colors.success, 0.6),
        },
        text: themeConfig[mode].text,
        divider: mode === 'dark' 
          ? 'rgba(255, 255, 255, 0.08)' 
          : 'rgba(0, 0, 0, 0.06)',
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: mode === 'dark' 
                  ? alpha(colors.primary, 0.15)
                  : alpha(colors.primary, 0.08),
              },
            },
            containedPrimary: {
              background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              '&:hover': {
                background: `linear-gradient(180deg, ${alpha(colors.primary, 0.9)} 0%, ${alpha(colors.secondary, 0.9)} 100%)`,
              },
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: '12px',
              border: mode === 'dark' 
                ? '1px solid rgba(255, 255, 255, 0.05)'
                : '1px solid rgba(0, 0, 0, 0.05)',
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary,
                },
              },
            },
          },
        },
        MuiAlert: {
          styleOverrides: {
            root: {
              borderRadius: '8px',
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
      },
      shape: {
        borderRadius: 8,
      },
      typography: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        h1: { fontWeight: 600 },
        h2: { fontWeight: 600 },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
      },
    });
  }, [resolvedTheme]);
}