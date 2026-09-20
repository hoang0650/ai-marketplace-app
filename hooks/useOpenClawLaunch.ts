import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { openclawApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';
import { openOpenClawUrl, OpenClawBrowserError } from '@/lib/openClawBrowser';

export function useOpenClawLaunch() {
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
    (maxAttempts = 30, intervalMs = 1000) => {
      clearApproveTimers();
      let attempts = 0;
      setApproving(true);

      const tick = async () => {
        attempts += 1;
        try {
          const res = await openclawApi.approvePairing();
          if (res?.success) {
            setApproving(false);
            clearApproveTimers();
            Alert.alert(t('openclaw.title'), t('openclaw.autoApproveSuccess'));
            return;
          }
          if (attempts >= maxAttempts) {
            setApproving(false);
            clearApproveTimers();
            Alert.alert(t('openclaw.title'), t('openclaw.autoApprovePending'));
          }
        } catch {
          if (attempts >= maxAttempts) {
            setApproving(false);
            clearApproveTimers();
            Alert.alert(t('openclaw.title'), t('openclaw.autoApprovePending'));
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
      const res = await openclawApi.launch();
      if (res?.success && res.url) {
        try {
          await openOpenClawUrl(res.url);
        } catch (error) {
          if (error instanceof OpenClawBrowserError) {
            Alert.alert(
              t('openclaw.title'),
              error.code === 'UNTRUSTED_URL' ? t('openclaw.untrustedUrl') : t('openclaw.certFailed'),
            );
          } else {
            Alert.alert(t('openclaw.title'), t('openclaw.openFailed'));
          }
          return;
        }
        Alert.alert(t('openclaw.title'), t('openclaw.opening'));
        approveDelayRef.current = setTimeout(() => {
          triggerAutoApprove(30, 1000);
        }, 800);
      } else {
        Alert.alert(t('openclaw.title'), res?.message || t('openclaw.urlFailed'));
      }
    } catch (error) {
      Alert.alert(t('openclaw.title'), getErrorMessage(error, language) || t('openclaw.urlError'));
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
