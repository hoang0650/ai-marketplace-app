export { authApi } from '@/api/auth';
export type { User, UserRole } from '@/api/types';
export { productsApi as catalogApi, billingApi as commerceApi } from '@/api';
export { API_CONFIG, GOOGLE_AUTH_CONFIG } from '@/api/client';
export const API_ENDPOINTS = {
  AUTH: { LOGIN: '/auth/login', REGISTER: '/auth/register', ME: '/auth/me', GOOGLE_CONFIG: '/auth/google/config', GOOGLE_LOGIN: '/auth/google/login' },
};
