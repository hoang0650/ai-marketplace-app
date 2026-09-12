import React from 'react';
export { useTheme } from '@/hooks/useT';
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
