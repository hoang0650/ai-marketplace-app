import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { MarketplaceAgent } from '@/api/types';
import { useTheme, useT } from '@/hooks/useT';
import { WEB_ORIGIN } from '@/api/legalCms';
import { agentBrand } from '@/constants/agents';

/** Catalog logos are web-relative paths (`/agents/openclaw.png`). */
export function agentLogoUri(agent: MarketplaceAgent): string {
  const url = String(agent.logoUrl || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${WEB_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function AgentLogo({ agent, size = 40 }: { agent: MarketplaceAgent; size?: number }) {
  const { colors } = useTheme();
  const uri = agentLogoUri(agent);
  const box = { width: size, height: size, borderRadius: size / 4 };
  if (!uri) {
    return (
      <View style={[box, styles.fallback, { backgroundColor: colors.mist }]}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>{agentBrand(agent).slice(0, 1)}</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={[box, { backgroundColor: colors.mist }]} resizeMode="cover" />;
}

export function agentVersionLine(agent: MarketplaceAgent): string {
  return [agent.version, agent.model].filter(Boolean).join(' · ');
}

/** Badge-ish label reusing t() keys where available. */
export function useAgentStatusLabel() {
  const { t } = useT();
  return (status?: string) => {
    const key = `agents.status.${status || 'running'}`;
    const v = t(key);
    return v === key ? status || '—' : v;
  };
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
