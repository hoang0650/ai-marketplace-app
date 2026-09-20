import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { hermesApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';
import { openOpenClawUrl, OpenClawBrowserError } from '@/lib/openClawBrowser';

/** Same UX as OpenClaw launch — opens `{userId}.hermes.aimarkets.vn`. */
export function useHermesLaunch() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t, language } = useT();
  const [opening, setOpening] = useState(false);
  const [approving, setApproving] = useState(false);
  const approvePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const approveDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearApproveTimers = useCallback(() => {
    if (approvePollRef.current) {
      clearInterval(approvePollRef.current);
      approvePollRef.current = null;
    }
    if (approveDelayRef.current) {
      clearTimeout(approveDelayRef.current);
      approveDelayRef.current = null;
    }
  }, []);

  useEffect(() => () => clearApproveTimers(), [clearApproveTimers]);

  const triggerAutoApprove = useCallback(
    (maxAttempts = 8, intervalMs = 1000) => {
      clearApproveTimers();
      let attempts = 0;
      setApproving(true);

      const tick = async () => {
        attempts += 1;
        try {
          const res = await hermesApi.approvePairing();
          if (res?.success) {
            setApproving(false);
            clearApproveTimers();
            if (!res.skipped) {
              Alert.alert(t('hermes.title'), t('hermes.autoApproveSuccess'));
            }
            return;
          }
          if (attempts >= maxAttempts) {
            setApproving(false);
            clearApproveTimers();
          }
        } catch {
          if (attempts >= maxAttempts) {
            setApproving(false);
            clearApproveTimers();
          }
        }
      };

      void tick();
      approvePollRef.current = setInterval(() => {
        if (attempts >= maxAttempts) {
          clearApproveTimers();
          setApproving(false);
          return;
        }
        void tick();
      }, intervalMs);
    },
    [clearApproveTimers, t],
  );

  const launch = useCallback(async () => {
    if (opening) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    setOpening(true);
    clearApproveTimers();
    try {
      const res = await hermesApi.launch();
      if (res?.success && res.url) {
        try {
          await openOpenClawUrl(res.url);
        } catch (error) {
          if (error instanceof OpenClawBrowserError) {
            Alert.alert(
              t('hermes.title'),
              error.code === 'UNTRUSTED_URL' ? t('hermes.untrustedUrl') : t('hermes.certFailed'),
            );
          } else {
            Alert.alert(t('hermes.title'), t('hermes.openFailed'));
          }
          return;
        }
        Alert.alert(t('hermes.title'), t('hermes.opening'));
        approveDelayRef.current = setTimeout(() => {
          triggerAutoApprove(8, 1000);
        }, 800);
      } else {
        Alert.alert(t('hermes.title'), res?.message || t('hermes.urlFailed'));
      }
    } catch (error) {
      Alert.alert(t('hermes.title'), getErrorMessage(error, language) || t('hermes.urlError'));
    } finally {
      setOpening(false);
    }
  }, [clearApproveTimers, isAuthenticated, language, opening, router, t, triggerAutoApprove]);

  const retryApprove = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    clearApproveTimers();
    triggerAutoApprove(8, 1500);
  }, [clearApproveTimers, isAuthenticated, router, triggerAutoApprove]);

  return { opening, approving, launch, retryApprove };
}
