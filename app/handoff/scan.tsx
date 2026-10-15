import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { parseHandoffCode } from '@/api/handoff';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useT, useTheme } from '@/hooks/useT';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { Button } from '@/components/ui/Button';

/** Scan the "Tiếp tục trên điện thoại" QR from the web, or type the 8-character code. */
export default function HandoffScanScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { t } = useT();
  const { colors } = useTheme();
  const [perm, requestPerm] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [bad, setBad] = useState(false);
  const done = useRef(false);

  const go = (value: string) => {
    const code = parseHandoffCode(value);
    if (!code) {
      setBad(true);
      return;
    }
    if (done.current) return;
    done.current = true;
    router.replace(href(`/handoff/${code}`));
  };

  if (!isAuthenticated) return <LoginPrompt />;
  const camOk = Platform.OS !== 'web' && perm?.granted;
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t('handoff.app.scanTitle') }} />
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t('handoff.app.scanHint')}</Text>
      {camOk ? (
        <View style={styles.camBox}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => go(data)}
          />
        </View>
      ) : Platform.OS !== 'web' ? (
        <Button title={t('handoff.app.allowCamera')} onPress={() => void requestPerm()} />
      ) : null}
      <Text style={[styles.or, { color: colors.textSecondary }]}>{t('handoff.app.orType')}</Text>
      <TextInput
        value={manual}
        onChangeText={(v) => {
          setManual(v.toUpperCase());
          setBad(false);
        }}
        placeholder="ABCD-2345"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={9}
        style={[styles.input, { color: colors.text, borderColor: bad ? '#ef4444' : colors.border }]}
        onSubmitEditing={() => go(manual)}
      />
      {bad ? <Text style={{ color: '#ef4444' }}>{t('handoff.err.HANDOFF_CODE_INVALID')}</Text> : null}
      <Button title={t('handoff.app.continue')} onPress={() => go(manual)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, gap: 14 },
  hint: { fontSize: 14, lineHeight: 20 },
  camBox: { height: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  or: { textAlign: 'center', marginTop: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 22, letterSpacing: 4, textAlign: 'center', fontWeight: '700' },
});
