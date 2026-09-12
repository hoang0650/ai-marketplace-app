import React, { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import {
  addScreenshotListener,
  allowScreenCaptureAsync,
  disableAppSwitcherProtectionAsync,
  enableAppSwitcherProtectionAsync,
  isAvailableAsync,
  preventScreenCaptureAsync,
} from 'expo-screen-capture';
import { useT } from '@/hooks/useT';

const SHIELD_KEY = 'aimc-content';

/** Blocks screenshots / recordings while licensed film or story is on screen. */
export function ContentShield({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return <ActiveContentShield />;
}

function ActiveContentShield() {
  const { t } = useT();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let cancelled = false;
    void (async () => {
      try {
        if (!(await isAvailableAsync()) || cancelled) return;
        await preventScreenCaptureAsync(SHIELD_KEY);
        if (Platform.OS === 'ios') {
          await enableAppSwitcherProtectionAsync(0.85).catch(() => {});
        }
      } catch {
        /* Expo Go / missing native module */
      }
    })();
    return () => {
      cancelled = true;
      void allowScreenCaptureAsync(SHIELD_KEY).catch(() => {});
      void disableAppSwitcherProtectionAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: { remove: () => void } | undefined;
    try {
      sub = addScreenshotListener(() => {
        Alert.alert(t('content.captureBlocked'), t('content.captureHint'));
      });
    } catch {
      return;
    }
    return () => {
      try {
        sub?.remove();
      } catch {
        /* ignore */
      }
    };
  }, [t]);

  return null;
}
