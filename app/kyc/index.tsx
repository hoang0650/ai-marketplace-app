import React, { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kycApi } from '@/api';
import type { KycIdType, KycSide } from '@/api/types';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { getErrorMessage } from '@/lib/errors';
import { HubBackButton } from '@/components/catalog/HubBackButton';

const SIDES: KycSide[] = ['front', 'back', 'selfie'];
const ID_TYPES: KycIdType[] = ['cccd', 'cmnd', 'passport', 'other'];

async function formFromAsset(asset: ImagePicker.ImagePickerAsset): Promise<FormData> {
  const form = new FormData();
  const name = asset.fileName || 'kyc.jpg';
  const type = asset.mimeType || 'image/jpeg';
  if (Platform.OS === 'web') {
    const blob = await fetch(asset.uri).then((r) => r.blob());
    form.append('image', blob, name);
  } else {
    form.append('image', { uri: asset.uri, name, type } as unknown as Blob);
  }
  return form;
}

export default function KycScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useT();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState<KycIdType>('cccd');
  const [idNumber, setIdNumber] = useState('');
  const [previews, setPreviews] = useState<Partial<Record<KycSide, string>>>({});
  const [uploading, setUploading] = useState<KycSide | null>(null);

  const q = useQuery({
    queryKey: ['kyc', 'me'],
    queryFn: async () => {
      const k = await kycApi.me();
      setFullName((n) => n || k.fullName || user?.name || '');
      setIdType(k.idType || 'cccd');
      if (k.idNumber) setIdNumber(k.idNumber);
      for (const side of SIDES) {
        const has = side === 'front' ? k.hasFront : side === 'back' ? k.hasBack : k.hasSelfie;
        if (has) {
          try {
            const r = await kycApi.documentUrl(side);
            setPreviews((m) => ({ ...m, [side]: r.url }));
          } catch {
            /* ignore */
          }
        }
      }
      return k;
    },
    enabled: isAuthenticated,
  });

  const submit = useMutation({
    mutationFn: () => kycApi.submit({ fullName: fullName.trim(), idType, idNumber: idNumber.trim() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kyc'] });
      Alert.alert('AI Markets', t('kyc.submitted'));
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });

  const pick = async (side: KycSide) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('AI Markets', t('kyc.err.permission'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(side);
    try {
      const form = await formFromAsset(result.assets[0]);
      const res = await kycApi.uploadDocument(side, form);
      if (res.previewUrl) setPreviews((m) => ({ ...m, [side]: res.previewUrl! }));
      else {
        const url = await kycApi.documentUrl(side);
        setPreviews((m) => ({ ...m, [side]: url.url }));
      }
      void qc.invalidateQueries({ queryKey: ['kyc'] });
    } catch (e) {
      Alert.alert('AI Markets', getErrorMessage(e as Error, language));
    } finally {
      setUploading(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('kyc.title'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
        <LoginPrompt />
      </Screen>
    );
  }

  const k = q.data;
  const canEdit = k?.canEdit !== false && k?.status !== 'pending' && k?.status !== 'verified';

  return (
    <Screen>
      <Stack.Screen options={{ title: t('kyc.title'), headerLeft: () => <HubBackButton />, headerBackVisible: false }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.lede, { color: colors.textSecondary }]}>{t('kyc.lede')}</Text>
        {user?.role === 'admin' ? (
          <Text style={{ color: colors.tint, fontWeight: '700', marginBottom: 12 }}>{t('kyc.adminBypass')}</Text>
        ) : null}
        {k ? (
          <Text style={[styles.status, { color: colors.text }]}>
            {t(`kyc.status.${k.status}`) !== `kyc.status.${k.status}` ? t(`kyc.status.${k.status}`) : k.status}
            {k.rejectReason ? ` · ${k.rejectReason}` : ''}
          </Text>
        ) : null}

        {SIDES.map((side) => (
          <View key={side} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{t(`kyc.side.${side}`)}</Text>
            {previews[side] ? (
              <Image source={{ uri: previews[side] }} style={styles.preview} />
            ) : (
              <View style={[styles.ph, { borderColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary }}>{t('kyc.noPhoto')}</Text>
              </View>
            )}
            {canEdit ? (
              <Button
                title={uploading === side ? t('kyc.sending') : t('kyc.upload')}
                variant="outline"
                loading={uploading === side}
                onPress={() => void pick(side)}
              />
            ) : null}
          </View>
        ))}

        {canEdit ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('kyc.fullName')}</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('kyc.idType')}</Text>
            <View style={styles.row}>
              {ID_TYPES.map((ty) => (
                <Chip key={ty} label={t(`kyc.idType.${ty}`)} active={idType === ty} onPress={() => setIdType(ty)} />
              ))}
            </View>
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t('kyc.idNumber')}</Text>
            <TextInput
              value={idNumber}
              onChangeText={setIdNumber}
              autoCapitalize="characters"
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <Button
              title={t('kyc.submit')}
              loading={submit.isPending}
              disabled={!k?.canSubmit}
              onPress={() => submit.mutate()}
            />
            {!k?.canSubmit ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('kyc.needAllDocs')}</Text>
            ) : null}
          </View>
        ) : null}

        {k?.status === 'verified' ? (
          <Button title={t('kyc.goWithdraw')} onPress={() => router.push(href('/wallet'))} style={{ marginTop: 16 }} />
        ) : null}
        {k?.status === 'pending' ? (
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>{t('kyc.waitReview')}</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40, gap: 10 },
  lede: { lineHeight: 20, marginBottom: 8 },
  status: { fontWeight: '800', marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  preview: { width: '100%', height: 160, borderRadius: 10 },
  ph: {
    height: 120,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
