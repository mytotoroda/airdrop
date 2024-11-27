'use client'
import { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ThemeProviderProps as NextThemesProviderProps } from "next-themes/dist/types"

interface ThemeProviderProps extends Omit<NextThemesProviderProps, 'children'> {
  children: ReactNode;
}

export function ThemeProvider({ 
  children, 
  ...props 
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}