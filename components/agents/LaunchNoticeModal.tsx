import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { href } from '@/lib/href';
import { openOpenClawUrl } from '@/lib/openClawBrowser';
import { useLaunchNotice } from '@/stores/launchNoticeStore';
import { useTheme, useT } from '@/hooks/useT';
import { formatDate, formatMoney } from '@/utils/format';

/** Rendered once in the root layout; shows the Launch / rent outcome (charge, period, refund). */
export function LaunchNoticeModal() {
  const { notice: n, retry, close } = useLaunchNotice();
  const { colors } = useTheme();
  const { t, language } = useT();
  const router = useRouter();
  if (!n) return null;

  const r = n.rental;
  const refund = n.refund;
  const title =
    n.kind === 'error'
      ? refund?.refunded
        ? 'launchNotice.refundedTitle'
        : 'launchNotice.errorTitle'
      : r?.charged
        ? 'launchNotice.successTitle'
        : r?.duplicate
          ? 'launchNotice.duplicateTitle'
          : 'launchNotice.openedTitle';
  const vnd = (v?: number | null) => formatMoney(Math.round(v || 0), 'VND');
  const lines: { text: string; tone?: 'warn' | 'muted' }[] = [];
  if (r) {
    if (refund?.refunded) lines.push({ text: t('launchNotice.refunded', { price: vnd(refund.feeVnd ?? r.chargedVnd) }) });
    else if (refund?.alreadyRefunded) lines.push({ text: t('launchNotice.refundAlready') });
    else if (refund?.failed) lines.push({ text: t('launchNotice.refundFailed', { tx: r.walletTxId || '-' }), tone: 'warn' });
    else {
      if (r.charged) lines.push({ text: t('launchNotice.charged', { price: vnd(r.chargedVnd), days: r.periodDays }) });
      else if (r.duplicate) lines.push({ text: t('launchNotice.notCharged') });
      if (r.paidUntil) lines.push({ text: t('launchNotice.paidUntil', { date: formatDate(r.paidUntil, language) }) });
      lines.push({ text: t(r.autoRenew ? 'launchNotice.autoRenewOn' : 'launchNotice.autoRenewOff') });
    }
  }
  if (n.kind === 'success') lines.push({ text: t('launchNotice.next') });
  else if (n.message) lines.push({ text: t('launchNotice.reason', { msg: n.message }), tone: 'muted' });

  const go = (path: string) => {
    close();
    router.push(href(path));
  };
  const ok = n.kind === 'success';
  const accent = ok ? colors.success : refund?.refunded ? colors.tint : colors.danger;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={styles.center} pointerEvents="box-none">
        <View
          accessibilityRole="alert"
          testID="launch-notice"
          style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: accent }]}
        >
          <View style={[styles.icon, { backgroundColor: accent }]}>
            <Text style={styles.iconText}>{ok ? '✓' : refund?.refunded ? '↺' : '!'}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t(title, { brand: n.brand })}</Text>
          {lines.map((l, i) => (
            <Text
              key={i}
              style={[
                styles.line,
                { color: l.tone === 'warn' ? colors.warning : l.tone === 'muted' ? colors.textSecondary : colors.text },
              ]}
            >
              • {l.text}
            </Text>
          ))}
          <View style={styles.actions}>
            {ok && n.url ? (
              <Button
                title={t('launchNotice.open', { brand: n.brand })}
                onPress={() => {
                  const url = n.url as string;
                  close();
                  void openOpenClawUrl(url).catch(() => undefined);
                }}
              />
            ) : null}
            {!ok && retry ? (
              <Button
                title={t('launchNotice.retry')}
                onPress={() => {
                  const fn = retry;
                  close();
                  fn();
                }}
              />
            ) : null}
            <Button title={t('launchNotice.setup')} variant="outline" onPress={() => go(`/hire-agent/${n.agentId}/setup`)} />
            <Button title={t('launchNotice.agentPage')} variant="outline" onPress={() => go(`/hire-agent/${n.agentId}`)} />
            {r ? <Button title={t('launchNotice.wallet')} variant="outline" onPress={() => go('/wallet')} /> : null}
            <Pressable onPress={close} style={styles.close} accessibilityRole="button">
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('launchNotice.close')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  center: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 8, maxWidth: 480, width: '100%', alignSelf: 'center' },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  iconText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  title: { fontSize: 19, fontWeight: '800', marginBottom: 4 },
  line: { fontSize: 14, lineHeight: 20 },
  actions: { gap: 8, marginTop: 10 },
  close: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
});
