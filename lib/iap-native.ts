import { requireOptionalNativeModule } from 'expo-modules-core';

/** Expo Go and JS-only clients have no StoreKit / Play Billing binary. */
export function isExpoIapNativeAvailable(): boolean {
  return requireOptionalNativeModule('ExpoIap') != null;
}
