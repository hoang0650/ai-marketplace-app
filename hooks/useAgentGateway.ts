import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  agentPlansApi,
  hermesApi,
  hiredAgentsApi,
  nanoclawApi,
  openclawApi,
  openwebuiApi,
  paperclipApi,
  spacebotApi,
} from '@/api';
import type {
  AgentGatewayApi,
  AgentGatewayId,
  AgentSshAccess,
  AgentSubscriptionStatus,
  MarketplaceAgent,
  OpenClawLaunchResult,
} from '@/api/types';
import { agentBrand, agentGatewayKey, agentSupportsSsh, isLaunchableAgent } from '@/constants/agents';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/hooks/useT';
import { ApiError, getErrorMessage } from '@/lib/errors';
import { openOpenClawUrl, OpenClawBrowserError } from '@/lib/openClawBrowser';
import { formatDate, formatMoney } from '@/utils/format';

const AGENT_SUBSCRIPTION_REQUIRED = 'AGENT_SUBSCRIPTION_REQUIRED';

function isLowBalance(error: unknown) {
  return error instanceof ApiError && (error.code === 'INSUFFICIENT_WALLET' || error.code === 'PAYOUT_HELD');
}

function confirmAsync(title: string, message: string, cancel: string, ok: string) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: ok, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

const GATEWAYS: Record<AgentGatewayId, AgentGatewayApi> = {
  openclaw: openclawApi,
  hermes: hermesApi,
  nanoclaw: nanoclawApi,
  spacebot: spacebotApi,
  openwebui: openwebuiApi,
  paperclip: paperclipApi,
};

export function gatewayApiFor(agent?: Parameters<typeof agentGatewayKey>[0]) {
  return GATEWAYS[agentGatewayKey(agent)];
}

/** t() keys for branding, e.g. `openclaw` | `hermes` | `nanoclaw`. */
function gatewayKey(agent?: Parameters<typeof agentGatewayKey>[0]) {
  return agentGatewayKey(agent);
}

export function useAgentSsh(agent: MarketplaceAgent | null | undefined) {
  const { t, language } = useT();
  const base = gatewayKey(agent);
  /** Keyed by agent so switching agents never shows stale credentials (no setState-on-mount). */
  const [state, setState] = useState<{ agentId: string; ssh: AgentSshAccess | null }>({ agentId: '', ssh: null });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const agentId = agent?.id || '';
  const ssh = state.agentId === agentId ? state.ssh : null;

  useEffect(() => {
    let cancelled = false;
    if (!agent || !agentSupportsSsh(agent)) return;
    gatewayApiFor(agent)
      .activeSsh(agent.id)
      .then((res) => {
        if (!cancelled && res?.active && res.session) {
          setState({ agentId: agent.id, ssh: { ...res.session, success: true } });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [agent]);

  const generate = useCallback(
    async (host?: string) => {
      if (!agent || !agentSupportsSsh(agent)) return;
      setBusy(true);
      setStatus(t(`${base}.sshGenerating`));
      try {
        const res = await gatewayApiFor(agent).generateSsh({
          agentId: agent.id,
          host: host?.trim() || undefined,
        });
        if (res?.success && res.command) {
          setState({ agentId: agent.id, ssh: res });
          setStatus(t(`${base}.sshReady`));
        } else {
          setStatus(res?.message || t(`${base}.sshFailed`));
        }
      } catch (e) {
        setStatus(getErrorMessage(e as Error, language) || t(`${base}.sshFailed`));
      } finally {
        setBusy(false);
      }
    },
    [agent, base, language, t],
  );

  const revoke = useCallback(async () => {
    if (!agent) return;
    setBusy(true);
    try {
      await gatewayApiFor(agent).revokeSsh(agent.id);
      setState({ agentId: agent.id, ssh: null });
      setStatus(t(`${base}.sshRevoked`));
    } finally {
      setBusy(false);
    }
  }, [agent, base, t]);

  return { ssh, busy, status, generate, revoke, setStatus };
}

/** Launch + auto-approve pairing for any launchable agent. */
export function useAgentLaunch(agent: MarketplaceAgent | null | undefined) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { t, language } = useT();
  const qc = useQueryClient();
  const [opening, setOpening] = useState(false);
  const [approving, setApproving] = useState(false);
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const base = gatewayKey(agent);
  const skipApprove = base !== 'openclaw';

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (delayRef.current) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const syncHired = useCallback(
    async (status: 'running' | 'archived' = 'running') => {
      if (!agent) return;
      try {
        await hiredAgentsApi.upsert({
          agentId: agent.id,
          slug: agent.slug,
          name: agent.name,
          status,
          version: agent.version,
          model: agent.model,
        });
        void qc.invalidateQueries({ queryKey: ['agents', 'hired'] });
      } catch {
        /* non-fatal: launch still succeeded */
      }
    },
    [agent, qc],
  );

  const triggerAutoApprove = useCallback(
    (maxAttempts = 30, intervalMs = 1000) => {
      clearTimers();
      let attempts = 0;
      setApproving(true);

      const tick = async () => {
        attempts += 1;
        try {
          const res = await gatewayApiFor(agent).approvePairing();
          if (res?.success) {
            setApproving(false);
            clearTimers();
            if (!res.skipped) Alert.alert(t(`${base}.title`), t(`${base}.autoApproveSuccess`));
            return;
          }
          if (attempts >= maxAttempts) {
            setApproving(false);
            clearTimers();
            Alert.alert(t(`${base}.title`), t(`${base}.autoApprovePending`));
          }
        } catch {
          if (attempts >= maxAttempts) {
            setApproving(false);
            clearTimers();
            Alert.alert(t(`${base}.title`), t(`${base}.autoApprovePending`));
          }
        }
      };

      void tick();
      pollRef.current = setInterval(() => {
        if (attempts >= maxAttempts) {
          clearTimers();
          setApproving(false);
          return;
        }
        void tick();
      }, intervalMs);
    },
    [agent, base, clearTimers, t],
  );

  /** Launch was refused for a missing/expired monthly plan: offer to pay one period from the wallet. */
  const rentPlan = useCallback(
    async (reason?: string): Promise<boolean> => {
      if (!agent) return false;
      const kind = agentGatewayKey(agent);
      const brand = agentBrand(agent);
      let plan: AgentSubscriptionStatus | null = null;
      try {
        plan = await agentPlansApi.one(kind);
      } catch {
        plan = null;
      }
      if (!plan) {
        Alert.alert(t(`${base}.title`), reason || t('agents.plan.required', { brand }));
        return false;
      }
      const ok = await confirmAsync(
        t('agents.plan.title'),
        `${reason || t('agents.plan.required', { brand })}\n\n${t('agents.plan.confirm', {
          price: formatMoney(plan.fee.vnd, 'VND'),
          days: plan.fee.periodDays,
          brand,
        })}\n\n${t('agents.plan.autoRenewDefault')}`,
        t('common.cancel'),
        t('agents.plan.rent'),
      );
      if (!ok) return false;
      try {
        const next = await agentPlansApi.subscribe(kind);
        qc.setQueryData(['agents', 'plans', kind], next);
        return next.active;
      } catch (error) {
        Alert.alert(
          t('agents.plan.title'),
          isLowBalance(error) ? t('agents.plan.lowBalance') : getErrorMessage(error as Error, language),
        );
        return false;
      }
    },
    [agent, base, language, qc, t],
  );

  const launch = useCallback(async (): Promise<boolean> => {
    if (!agent || !isLaunchableAgent(agent)) {
      Alert.alert(t(`${base}.title`), t(`${base}.comingSoon`));
      return false;
    }
    if (opening) return false;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return false;
    }
    setOpening(true);
    clearTimers();
    try {
      let res: OpenClawLaunchResult;
      try {
        res = await gatewayApiFor(agent).launch();
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== AGENT_SUBSCRIPTION_REQUIRED) throw error;
        if (!(await rentPlan(error.userMessage))) return false;
        res = await gatewayApiFor(agent).launch();
      }
      if (res?.success && res.url) {
        try {
          await openOpenClawUrl(res.url);
        } catch (error) {
          if (error instanceof OpenClawBrowserError) {
            Alert.alert(
              t(`${base}.title`),
              error.code === 'UNTRUSTED_URL' ? t(`${base}.untrustedUrl`) : t(`${base}.certFailed`),
            );
          } else {
            Alert.alert(t(`${base}.title`), t(`${base}.openFailed`));
          }
          return false;
        }
        if (res.username && res.password) {
          setCreds({ username: res.username, password: res.password });
        }
        void syncHired('running');
        Alert.alert(t(`${base}.title`), t(`${base}.opening`));
        if (!skipApprove) {
          delayRef.current = setTimeout(() => triggerAutoApprove(30, 1000), 800);
        }
        return true;
      }
      Alert.alert(t(`${base}.title`), res?.message || t(`${base}.urlFailed`));
      return false;
    } catch (error) {
      Alert.alert(
        t(`${base}.title`),
        getErrorMessage(error as Error, language) || t(`${base}.urlError`),
      );
      return false;
    } finally {
      setOpening(false);
    }
  }, [
    agent,
    base,
    clearTimers,
    isAuthenticated,
    language,
    opening,
    rentPlan,
    router,
    skipApprove,
    syncHired,
    t,
    triggerAutoApprove,
  ]);

  const retryApprove = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    clearTimers();
    triggerAutoApprove(8, 1500);
  }, [clearTimers, isAuthenticated, router, triggerAutoApprove]);

  return {
    opening,
    approving,
    creds,
    launch,
    retryApprove,
    /** Surfaced so callers can show `{userId}.<agent>.aimarkets.vn` for the signed-in user. */
    userId: user?.id || '',
  };
}

/** Public monthly price + token policy per hosted agent. */
export function useAgentPricing() {
  const q = useQuery({
    queryKey: ['agents', 'pricing'],
    queryFn: () => agentPlansApi.pricing(),
    staleTime: 10 * 60_000,
  });
  return q.data || [];
}

/** Monthly plan of one agent + rent/renew from the wallet. */
export function useAgentPlan(agent: MarketplaceAgent | null | undefined) {
  const { isAuthenticated } = useAuth();
  const { t, language } = useT();
  const qc = useQueryClient();
  const kind = agent && isLaunchableAgent(agent) ? agentGatewayKey(agent) : null;
  const brand = agentBrand(agent);
  const pricing = useAgentPricing().find((p) => p.agentId === kind) || null;
  const q = useQuery({
    queryKey: ['agents', 'plans', kind],
    queryFn: () => agentPlansApi.one(kind as AgentGatewayId),
    enabled: isAuthenticated && !!kind,
  });
  const m = useMutation({
    mutationFn: () => agentPlansApi.subscribe(kind as AgentGatewayId),
    onSuccess: (next) => {
      qc.setQueryData(['agents', 'plans', kind], next);
      Alert.alert(t('agents.plan.title'), t('agents.plan.paid', { brand, date: formatDate(next.paidUntil, language) }));
    },
    onError: (e: Error) =>
      Alert.alert(t('agents.plan.title'), isLowBalance(e) ? t('agents.plan.lowBalance') : getErrorMessage(e, language)),
  });
  const auto = useMutation({
    mutationFn: (on: boolean) => agentPlansApi.setAutoRenew(kind as AgentGatewayId, on),
    onSuccess: (next) => qc.setQueryData(['agents', 'plans', kind], next),
    onError: (e: Error) => Alert.alert(t('agents.plan.title'), getErrorMessage(e, language)),
  });
  const plan = q.data || null;

  const subscribe = useCallback(async () => {
    if (!kind || !plan || m.isPending) return;
    const confirm = t('agents.plan.confirm', { price: formatMoney(plan.fee.vnd, 'VND'), days: plan.fee.periodDays, brand });
    const ok = await confirmAsync(
      t('agents.plan.title'),
      plan.paidUntil ? confirm : `${confirm}\n\n${t('agents.plan.autoRenewDefault')}`,
      t('common.cancel'),
      plan.active ? t('agents.plan.renew') : t('agents.plan.rent'),
    );
    if (ok) m.mutate();
  }, [brand, kind, m, plan, t]);

  return {
    pricing,
    plan,
    subscribe,
    subscribing: m.isPending,
    setAutoRenew: auto.mutate,
    updatingAutoRenew: auto.isPending,
    refetch: q.refetch,
  };
}

/** Server-backed "My Agents" list (synced across web + app). */
export function useHiredAgents() {
  const { isAuthenticated } = useAuth();
  const q = useQuery({
    queryKey: ['agents', 'hired'],
    queryFn: () => hiredAgentsApi.list(),
    enabled: isAuthenticated,
  });
  return { hired: q.data || [], isLoading: q.isLoading, refetch: q.refetch };
}

export function useArchiveHiredAgent() {
  const qc = useQueryClient();
  const { t, language } = useT();
  const m = useMutation({
    mutationFn: (agentId: string) => hiredAgentsApi.update(agentId, { status: 'archived' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['agents', 'hired'] }),
    onError: (e: Error) => Alert.alert(t('agents.title'), getErrorMessage(e, language)),
  });
  return { archive: m.mutateAsync, archiving: m.isPending };
}
