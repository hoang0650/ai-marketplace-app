import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'aimarkets_access_token';
const REFRESH_KEY = 'aimarkets_refresh_token';
const USER_KEY = 'aimarkets_user';

const webMemory = new Map<string, string>();

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    webMemory.set(key, value);
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    if (webMemory.has(key)) return webMemory.get(key) ?? null;
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === 'web') {
    webMemory.delete(key);
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  getAccessToken: () => getItem(TOKEN_KEY),
  setAccessToken: (token: string) => setItem(TOKEN_KEY, token),
  getRefreshToken: () => getItem(REFRESH_KEY),
  setRefreshToken: (token: string) => setItem(REFRESH_KEY, token),
  getUserJson: () => getItem(USER_KEY),
  setUserJson: (json: string) => setItem(USER_KEY, json),
  clear: async () => {
    await Promise.all([removeItem(TOKEN_KEY), removeItem(REFRESH_KEY), removeItem(USER_KEY)]);
  },
};
