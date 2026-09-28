import React, { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kycApi } from '@/api';
import type { KycIdType, KycOrgType, KycSide, KycSubjectType, KycSubmitBody } from '@/api/types';
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

const SIDES: KycSide[] = ['front', 'back'];
const ID_TYPES: KycIdType[] = ['cccd', 'cmnd', 'passport', 'other'];
const SUBJECT_TYPES: KycSubjectType[] = ['individual', 'organization'];
const ORG_TYPES: KycOrgType[] = ['household', 'company'];

/** Mirrors the API rules in ai-marketplace-api/src/utils/kyc.js. */
const PERSONAL_TAX_RE = /^(\d{10}|\d{12})$/;
const COMPANY_TAX_RE = /^\d{10}(-\d{3})?$/;
const HOUSEHOLD_TAX_RE = /^(\d{10}(-\d{3})?|\d{12})$/;
const normalizeTax = (v: string) => v.replace(/[\s.]/g, '');

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
  const [subjectType, setSubjectType] = useState<KycSubjectType>('individual');
  const [fullName, setFullName] = useState('');
  const [idType, setIdType] = useState<KycIdType>('cccd');
  const [idNumber, setIdNumber] = useState('');
  const [personalTaxCode, setPersonalTaxCode] = useState('');
  const [orgType, setOrgType] = useState<KycOrgType>('household');
  const [orgName, setOrgName] = useState('');
  const [orgTaxCode, setOrgTaxCode] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [previews, setPreviews] = useState<Partial<Record<KycSide, string>>>({});
  const [uploading, setUploading] = useState<KycSide | null>(null);
  const isOrg = subjectType === 'organization';

  const q = useQuery({
    queryKey: ['kyc', 'me'],
    queryFn: async () => {
      const k = await kycApi.me();
      setSubjectType(k.subjectType || 'individual');
      setFullName((n) => n || k.fullName || user?.name || '');
      setIdType(k.idType || 'cccd');
      if (k.idNumber) setIdNumber(k.idNumber);
      if (k.personalTaxCode) setPersonalTaxCode(k.personalTaxCode);
      if (k.orgType) setOrgType(k.orgType);
      if (k.orgName) setOrgName(k.orgName);
      if (k.orgTaxCode) setOrgTaxCode(k.orgTaxCode);
      if (k.orgAddress) setOrgAddress(k.orgAddress);
      for (const side of SIDES) {
        if (side === 'front' ? k.hasFront : k.hasBack) {
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

  const validationError = (): string => {
    if (fullName.trim().length < 2) return t(isOrg ? 'kyc.err.repName' : 'kyc.err.name');
    if (idNumber.replace(/\s+/g, '').length < 6) return t('kyc.err.idNumber');
    if (!isOrg) return PERSONAL_TAX_RE.test(normalizeTax(personalTaxCode)) ? '' : t('kyc.err.personalTax');
    if (orgName.trim().length < 3) return t('kyc.err.orgName');
    const taxRe = orgType === 'company' ? COMPANY_TAX_RE : HOUSEHOLD_TAX_RE;
    if (!taxRe.test(normalizeTax(orgTaxCode))) return t(orgType === 'company' ? 'kyc.err.companyTax' : 'kyc.err.householdTax');
    if (orgAddress.trim().length < 10) return t('kyc.err.orgAddress');
    return '';
  };

  const submit = useMutation({
    mutationFn: () => {
      const body: KycSubmitBody = { subjectType, fullName: fullName.trim(), idType, idNumber: idNumber.trim() };
      if (isOrg) {
        Object.assign(body, {
          orgType,
          orgName: orgName.trim(),
          orgTaxCode: normalizeTax(orgTaxCode),
          orgAddress: orgAddress.trim(),
        });
      } else {
        body.personalTaxCode = normalizeTax(personalTaxCode);
      }
      return kycApi.submit(body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['kyc'] });
      Alert.alert('AI Markets', t('kyc.submitted'));
    },
    onError: (e: Error) => Alert.alert('AI Markets', getErrorMessage(e, language)),
  });

  const onSubmit = () => {
    const invalid = validationError();
    if (invalid) {
      Alert.alert('AI Markets', invalid);
      return;
    }
    submit.mutate();
  };

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
  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border }];
  const label = (key: string) => <Text style={[styles.label, { color: colors.textSecondary }]}>{t(key)}</Text>;
  const hint = (key: string) => <Text style={[styles.hint, { color: colors.textSecondary }]}>{t(key)}</Text>;
  const section = (key: string) => <Text style={[styles.section, { color: colors.text }]}>{t(key)}</Text>;
  const summaryRow = (key: string, value: string) =>
    value ? (
      <View key={key} style={styles.summaryRow}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t(key)}</Text>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{value}</Text>
      </View>
    ) : null;

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

        {canEdit ? (
          <View style={styles.typeRow} accessibilityRole="radiogroup">
            {SUBJECT_TYPES.map((st) => {
              const active = subjectType === st;
              return (
                <Pressable
                  key={st}
                  onPress={() => setSubjectType(st)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={[
                    styles.typeCard,
                    {
                      borderColor: active ? colors.luxDark : colors.border,
                      backgroundColor: colors.cardBackground,
                      borderWidth: active ? 2 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{t(`kyc.subject.${st}`)}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
                    {t(`kyc.subject.${st}.hint`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : k ? (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}>
            {summaryRow('kyc.subjectType', t(`kyc.subject.${k.subjectType || 'individual'}`))}
            {k.subjectType === 'organization' ? (
              <>
                {summaryRow('kyc.orgType', t(`kyc.orgType.${k.orgType || 'household'}`))}
                {summaryRow(k.orgType === 'company' ? 'kyc.orgName.company' : 'kyc.orgName.household', k.orgName)}
                {summaryRow('kyc.orgTaxCode', k.orgTaxCode)}
                {summaryRow('kyc.orgAddress', k.orgAddress)}
              </>
            ) : null}
            {summaryRow(k.subjectType === 'organization' ? 'kyc.repName' : 'kyc.fullName', k.fullName)}
            {summaryRow('kyc.idNumber', `${t(`kyc.idType.${k.idType}`)} · ${k.idNumberMasked}`)}
            {k.subjectType !== 'organization' ? summaryRow('kyc.personalTaxCode', k.personalTaxCodeMasked) : null}
          </View>
        ) : null}

        {canEdit && isOrg ? (
          <View style={styles.fields}>
            {section('kyc.orgSection')}
            {label('kyc.orgType')}
            <View style={styles.row}>
              {ORG_TYPES.map((ot) => (
                <Chip key={ot} label={t(`kyc.orgType.${ot}`)} active={orgType === ot} onPress={() => setOrgType(ot)} />
              ))}
            </View>
            {label(orgType === 'company' ? 'kyc.orgName.company' : 'kyc.orgName.household')}
            <TextInput value={orgName} onChangeText={setOrgName} style={inputStyle} autoComplete="organization" />
            {label('kyc.orgTaxCode')}
            <TextInput value={orgTaxCode} onChangeText={setOrgTaxCode} style={inputStyle} keyboardType="numbers-and-punctuation" />
            {hint(orgType === 'company' ? 'kyc.orgTaxCode.hintCompany' : 'kyc.orgTaxCode.hintHousehold')}
            {label('kyc.orgAddress')}
            <TextInput
              value={orgAddress}
              onChangeText={setOrgAddress}
              style={[...inputStyle, styles.multiline]}
              multiline
              textAlignVertical="top"
              autoComplete="street-address"
            />
            {hint('kyc.orgAddress.hint')}
          </View>
        ) : null}

        {canEdit ? (
          <View style={styles.fields}>
            {section(isOrg ? 'kyc.repSection' : 'kyc.personSection')}
            {label(isOrg ? 'kyc.repName' : 'kyc.fullName')}
            <TextInput value={fullName} onChangeText={setFullName} style={inputStyle} autoComplete="name" />
            {label('kyc.idType')}
            <View style={styles.row}>
              {ID_TYPES.map((ty) => (
                <Chip key={ty} label={t(`kyc.idType.${ty}`)} active={idType === ty} onPress={() => setIdType(ty)} />
              ))}
            </View>
            {label('kyc.idNumber')}
            <TextInput value={idNumber} onChangeText={setIdNumber} autoCapitalize="characters" style={inputStyle} />
            {!isOrg ? (
              <>
                {label('kyc.personalTaxCode')}
                <View style={styles.inline}>
                  <TextInput
                    value={personalTaxCode}
                    onChangeText={setPersonalTaxCode}
                    keyboardType="number-pad"
                    style={[...inputStyle, { flex: 1 }]}
                  />
                  {idType === 'cccd' && idNumber ? (
                    <Chip label={t('kyc.useIdAsTax')} onPress={() => setPersonalTaxCode(idNumber.replace(/\s+/g, ''))} />
                  ) : null}
                </View>
                {hint('kyc.personalTaxCode.hint')}
              </>
            ) : null}
          </View>
        ) : null}

        {section(isOrg ? 'kyc.docsRep' : 'kyc.docs')}
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
            <Button title={t('kyc.submit')} loading={submit.isPending} disabled={!k?.canSubmit} onPress={onSubmit} />
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
  section: { fontWeight: '800', fontSize: 16, marginTop: 8 },
  label: { fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: -4 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeCard: { flex: 1, borderRadius: 14, padding: 12, gap: 4 },
  fields: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  summaryRow: { gap: 2 },
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
  multiline: { minHeight: 72 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
