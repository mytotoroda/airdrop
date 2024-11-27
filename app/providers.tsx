// app/providers.tsx
'use client'

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'

const Providers = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme()

  // Create theme based on the system/user preference
  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: theme === 'dark' ? 'dark' : 'light',
          primary: {
            main: '#3b82f6',
          },
          background: {
            default: theme === 'dark' ? '#111827' : '#ffffff',
            paper: theme === 'dark' ? '#1f2937' : '#ffffff',
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                scrollbarColor: theme === 'dark' ? '#4b5563 #1f2937' : '#cbd5e1 #f1f5f9',
                '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
                  width: '8px',
                  height: '8px',
                },
                '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
                  borderRadius: '4px',
                  backgroundColor: theme === 'dark' ? '#4b5563' : '#cbd5e1',
                },
                '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#f1f5f9',
                },
              },
            },
          },
        },
      }),
    [theme]
  )

  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </NextThemesProvider>
  )
}

export default Providers