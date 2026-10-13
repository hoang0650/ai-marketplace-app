import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { href } from '@/lib/href';
import { useTheme, useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { resolveLegalPolicy } from '@/constants/legal';
import { legalWebUrl, openWeb } from '@/lib/legalLinks';

/**
 * Deep link /legal/<slug> (and old aliases such as /legal/terms): legal texts live on the website,
 * so this opens https://aimarkets.vn/legal/<slug>?lang=… in the in-app browser and goes back.
 */
export default function LegalDocumentScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const raw = String(Array.isArray(type) ? type[0] : type || '');
  const meta = resolveLegalPolicy(raw);
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const url = legalWebUrl(meta?.slug ?? null, language);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    void openWeb(url).finally(() => {
      if (router.canGoBack()) router.back();
      else router.replace(href('/legal'));
    });
  }, [url, router]);

  const title = meta ? t(`legal.policy.${meta.slug}.title`) : t('legal.hub.title');
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <View style={styles.center}>
        <ActivityIndicator color={colors.tint} />
        <Pressable onPress={() => void openWeb(url)} style={styles.btn}>
          <Text style={{ color: colors.tint, fontWeight: '800' }}>{t('legal.doc.openWeb')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  btn: { marginTop: 16, minHeight: 44, justifyContent: 'center' },
});
