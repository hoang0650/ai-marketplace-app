import React from 'react';
export { useAuth } from '@/hooks/useAuth';
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
