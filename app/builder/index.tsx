import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { builderApi } from '@/api';
import type { BuilderKind, ByokProvider } from '@/api/types';
import { getErrorMessage } from '@/lib/errors';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Button } from '@/components/ui/Button';
import { displayFont } from '@/constants/fonts';
import { formatDate } from '@/utils/format';

const GOLD = '#c9a961';
const IDEAS: Record<BuilderKind, string[]> = {
  web: ['builder.idea.web.1', 'builder.idea.web.2', 'builder.idea.web.3'],
  app: ['builder.idea.app.1', 'builder.idea.app.2', 'builder.idea.app.3'],
};

export default function BuilderHomeScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { kind: presetKind } = useLocalSearchParams<{ kind?: string }>();
  const [kind, setKind] = useState<BuilderKind>(presetKind === 'app' ? 'app' : presetKind === 'web' ? 'web' : 'app');
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [keyProvider, setKeyProvider] = useState<ByokProvider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);

  const providers = useQuery({ queryKey: ['builder-providers'], queryFn: builderApi.providers, enabled: isAuthenticated });
  const projects = useQuery({ queryKey: ['builder-projects'], queryFn: builderApi.list, enabled: isAuthenticated });
  const activeKeys = useMemo(() => (providers.data?.keys || []).filter((k) => k.status === 'active'), [providers.data]);
  const hasKey = activeKeys.length > 0;

  const saveKey = useMutation({
    mutationFn: () => builderApi.saveKey(keyProvider!.id, { apiKey: apiKey.trim() }),
    onSuccess: () => {
      setApiKey('');
      setKeyProvider(null);
      setError('');
      void qc.invalidateQueries({ queryKey: ['builder-providers'] });
    },
    onError: (e) => setError(getErrorMessage(e, language)),
  });

  const create = useMutation({
    mutationFn: () => {
      const text = prompt.trim();
      const name = text.split(/[.\n]/)[0].slice(0, 60) || t(`builder.kind.${kind}`);
      return builderApi.create({ name, kind, provider: activeKeys[0]?.provider });
    },
    onSuccess: (r) => {
      const text = prompt.trim();
      setPrompt('');
      void qc.invalidateQueries({ queryKey: ['builder-projects'] });
      router.push(href(`/builder/${r.project.id}?prompt=${encodeURIComponent(text)}`));
    },
    onError: (e) => setError(getErrorMessage(e, language)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => builderApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['builder-projects'] }),
    onError: (e) => setError(getErrorMessage(e, language)),
  });

  if (!isAuthenticated) return <LoginPrompt />;

  const input = {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  } as const;

  const keyForm = (
    <View style={{ gap: 10, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(providers.data?.providers || [])
          .filter((p) => !p.custom)
          .map((p) => {
            const saved = (providers.data?.keys || []).find((k) => k.provider === p.id);
            const active = keyProvider?.id === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setKeyProvider(active ? null : p)}
                style={{ borderWidth: active ? 2 : 1, borderColor: active ? GOLD : colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <Text style={{ color: colors.text, fontSize: 13 }}>
                  {p.label}
                  {saved ? (saved.status === 'active' ? ' ✓' : ' !') : ''}
                </Text>
              </Pressable>
            );
          })}
      </View>
      {keyProvider ? (
        <View style={{ gap: 8 }}>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            placeholder={keyProvider.keyHint || 'API key'}
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={input}
          />
          <Button title={t('builder.keys.save')} loading={saveKey.isPending} disabled={!apiKey.trim()} onPress={() => saveKey.mutate()} />
          {keyProvider.keyUrl ? (
            <Pressable onPress={() => void Linking.openURL(keyProvider.keyUrl)}>
              <Text style={{ color: GOLD, fontSize: 13 }}>{t('builder.keys.getKey')} →</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18 }}>{t('builder.keys.hint')}</Text>
    </View>
  );

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={providers.isFetching || projects.isFetching}
            onRefresh={() => {
              void providers.refetch();
              void projects.refetch();
            }}
          />
        }
      >
        <Text style={{ color: colors.text, fontSize: 28, fontFamily: displayFont, fontWeight: '600', marginTop: 8 }}>{t('builder.title')}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, lineHeight: 21, fontSize: 14 }}>{t('builder.subtitle')}</Text>

        {error ? <Text style={{ color: colors.danger, marginTop: 12, lineHeight: 20 }}>{error}</Text> : null}

        {providers.isSuccess && !hasKey ? (
          <View style={{ marginTop: 16, borderWidth: 1, borderColor: '#fbbf24', borderRadius: 14, padding: 14 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{t('builder.needKey.title')}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 6, lineHeight: 20 }}>{t('builder.needKey.body')}</Text>
            {keyForm}
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          {(['app', 'web'] as BuilderKind[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={{ flex: 1, borderWidth: kind === k ? 2 : 1, borderColor: kind === k ? GOLD : colors.border, borderRadius: 14, padding: 12 }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t(`builder.kind.${k}`)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 17 }}>{t(`builder.kind.${k}.hint`)}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          multiline
          maxLength={8000}
          placeholder={t(`builder.promptPh.${kind}`)}
          placeholderTextColor={colors.textSecondary}
          style={[input, { minHeight: 110, marginTop: 12, textAlignVertical: 'top' }]}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {IDEAS[kind].map((key) => (
            <Pressable key={key} onPress={() => setPrompt(t(key))} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                {t(key)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button
          title={t('builder.startBuild')}
          loading={create.isPending}
          disabled={!hasKey || !prompt.trim()}
          onPress={() => create.mutate()}
          style={{ marginTop: 12 }}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t('builder.projects')}</Text>
          {hasKey ? (
            <Pressable onPress={() => setShowKeys((v) => !v)} hitSlop={10}>
              <Text style={{ color: GOLD, fontWeight: '700' }}>{t('builder.keys.manage')}</Text>
            </Pressable>
          ) : null}
        </View>
        {showKeys && hasKey ? keyForm : null}

        {(projects.data?.projects || []).length === 0 ? (
          <Text style={{ color: colors.textSecondary, marginTop: 8 }}>{t('builder.noProjects')}</Text>
        ) : (
          (projects.data?.projects || []).map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push(href(`/builder/${p.id}`))}
              onLongPress={() =>
                Alert.alert(t('builder.delete'), t('builder.confirmDelete', { name: p.name }), [
                  { text: t('common.cancel'), style: 'cancel' },
                  { text: t('builder.delete'), style: 'destructive', onPress: () => remove.mutate(p.id) },
                ])
              }
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginTop: 10, gap: 4 }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{p.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {t(`builder.kind.${p.kind}`)} · {p.fileCount} {t('builder.files')} · {formatDate(p.updatedAt, language)}
              </Text>
            </Pressable>
          ))
        )}
        {(projects.data?.projects || []).length ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>{t('builder.longPressDelete')}</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
