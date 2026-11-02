import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { complaintsApi } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { getErrorMessage } from '@/lib/errors';
import { isBlockedTarget, useBlockStore } from '@/stores/blockStore';
import { useToastStore } from '@/stores/toastStore';

const REASONS = ['spam', 'harassment', 'scam', 'illegal', 'other'] as const;
type Reason = (typeof REASONS)[number];

export type SafetyTarget = {
  kind: 'product' | 'seller' | 'review' | 'message';
  id: string;
  title: string;
  userId?: string;
  slug?: string;
  name?: string;
};

/** Report goes to the existing complaints API. Block hides that person on this device. */
export function SafetyActions({ target, compact }: { target: SafetyTarget; compact?: boolean }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { user, isAuthenticated } = useAuth();
  const entries = useBlockStore((s) => s.entries);
  const block = useBlockStore((s) => s.block);
  const unblock = useBlockStore((s) => s.unblock);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason>('spam');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const own =
    (!!user?.id && !!target.userId && String(user.id) === String(target.userId)) ||
    (!!user?.creatorSlug && !!target.slug && user.creatorSlug === target.slug);
  if (own) return null;

  const blocked = isBlockedTarget(target, entries);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['home'] });
    void qc.invalidateQueries({ queryKey: ['search'] });
    void qc.invalidateQueries({ queryKey: ['products'] });
    void qc.invalidateQueries({ queryKey: ['wishlist'] });
    void qc.invalidateQueries({ queryKey: ['reviews'] });
    void qc.invalidateQueries({ queryKey: ['chat'] });
  };

  const onBlock = () => {
    if (blocked) {
      unblock(target);
      refresh();
      return;
    }
    block({ userId: target.userId, slug: target.slug, name: target.name || target.title });
    refresh();
    useToastStore.getState().show(t('safety.blocked'));
  };

  const send = async () => {
    if (!isAuthenticated) {
      setOpen(false);
      router.push('/auth/login');
      return;
    }
    setBusy(true);
    setError('');
    const body = [
      'UGC report',
      `target: ${target.kind}`,
      `id: ${target.id}`,
      target.slug ? `seller: ${target.slug}` : '',
      target.userId ? `user: ${target.userId}` : '',
      `title: ${target.title}`,
      `reason: ${reason}`,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await complaintsApi.create({
        kind: 'buyer_platform',
        body,
        requestedAction: 'review_ugc',
      });
      setOpen(false);
      useToastStore.getState().show(t('safety.reported'));
    } catch (err) {
      setError(getErrorMessage(err, language));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: compact ? 6 : 10 }}>
      <Pressable onPress={() => { setError(''); setOpen(true); }} hitSlop={8} accessibilityRole="button">
        <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: compact ? 12 : 14 }}>{t('safety.report')}</Text>
      </Pressable>
      <Pressable onPress={onBlock} hitSlop={8} accessibilityRole="button">
        <Text style={{ color: colors.danger, fontWeight: '700', fontSize: compact ? 12 : 14 }}>
          {blocked ? t('safety.unblock') : t('safety.block')}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{t('safety.title')}</Text>
            <Text style={{ color: colors.textSecondary }} numberOfLines={2}>{target.title}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {REASONS.map((item) => {
                const on = item === reason;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setReason(item)}
                    style={{
                      borderWidth: 1,
                      borderColor: on ? colors.tint : colors.border,
                      backgroundColor: on ? colors.luxDark : colors.cardBackground,
                      borderRadius: 999,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: on ? '#f2efe8' : colors.text, fontWeight: '700' }}>{t(`safety.reason.${item}`)}</Text>
                  </Pressable>
                );
              })}
            </View>
            {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
            <Pressable
              onPress={() => void send()}
              disabled={busy}
              accessibilityRole="button"
              style={{ minHeight: 48, borderRadius: 12, backgroundColor: colors.luxDark, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#f2efe8', fontWeight: '800' }}>{busy ? '…' : t('safety.send')}</Text>
            </Pressable>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
