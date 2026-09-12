export const API_CONFIG = {
  BASE_URL: (process.env.EXPO_PUBLIC_API_URL || 'https://api.aimarkets.vn/v1').replace(/\/$/, ''),
  TIMEOUT: 20000,
};

export const GOOGLE_AUTH_CONFIG = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    GOOGLE_CONFIG: '/auth/google/config',
    GOOGLE_LOGIN: '/auth/google/login',
  },
  PRODUCTS: '/products',
  CATEGORIES: '/categories',
  ORDERS: '/orders',
  WALLET: '/wallet',
  WALLET_SUMMARY: '/wallet/summary',
  WALLET_DEPOSIT: '/wallet/deposit',
  WALLET_WITHDRAW: '/wallet/withdraw',
  CHECKOUT: '/billing/checkout',
  NOTIFICATIONS: '/notifications',
};
