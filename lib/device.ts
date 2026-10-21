import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const KEY = 'phai.deviceId';
let cached = '';

/** Random per-install id sent as X-Device-Id to the handoff/devices endpoints. */
export async function deviceId(): Promise<string> {
  if (cached) return cached;
  let id = (await AsyncStorage.getItem(KEY)) || '';
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    const hex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
    id = `app-${hex}`;
    await AsyncStorage.setItem(KEY, id);
  }
  cached = id;
  return id;
}

export function devicePlatform(): 'ios' | 'android' | 'web' {
  return Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
}

export function deviceLabel(): string {
  const base = Platform.OS === 'ios' ? (Platform.isPad ? 'iPad' : 'iPhone') : Platform.OS === 'android' ? 'Android' : 'Web';
  return `${base} · AI Markets app`;
}

export async function deviceHeaders(): Promise<Record<string, string>> {
  return { 'X-Device-Id': await deviceId(), 'X-Device-Platform': devicePlatform(), 'X-Device-Name': encodeURIComponent(deviceLabel()) };
}
