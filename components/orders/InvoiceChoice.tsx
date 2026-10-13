import React, { useEffect, useState } from 'react';
import { Linking, Pressable, Switch, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoiceApi, type InvoiceChoiceBody } from '@/api/invoice';
import { useT, useTheme } from '@/hooks/useT';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/utils/format';

/** Buyer VAT invoice choice for one order. Default: no invoice ("Người mua không lấy hóa đơn"). */
export function InvoiceChoice({ orderId }: { orderId: string }) {
  const { colors } = useTheme();
  const { t, language } = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['invoice', orderId], queryFn: () => invoiceApi.get(orderId), enabled: !!orderId });
  const [open, setOpen] = useState(false);
  const [wants, setWants] = useState(false);
  const [buyerType, setBuyerType] = useState<'organization' | 'individual'>('individual');
  const [buyerName, setBuyerName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [personalId, setPersonalId] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [budgetUnitCode, setBudgetUnitCode] = useState('');
  const [saveProfile, setSaveProfile] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const r = q.data;
    if (!r) return;
    const inv = r.invoice;
    const src = inv && inv.wantsInvoice ? inv : r.prefill;
    setWants(!!inv?.wantsInvoice);
    setBuyerType(inv?.wantsInvoice && inv.buyerType !== 'none' ? inv.buyerType : r.prefill.buyerType);
    setBuyerName(src.buyerName || '');
    setTaxCode(src.taxCode || '');
    setPersonalId(src.personalId || '');
    setAddress(src.address || '');
    setEmail(src.email || '');
    setBudgetUnitCode(src.budgetUnitCode || '');
    setSaveProfile(!r.hasSavedProfile);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => {
      const body: InvoiceChoiceBody = wants
        ? {
            wantsInvoice: true,
            buyerType,
            buyerName,
            taxCode: buyerType === 'organization' ? taxCode : '',
            personalId: buyerType === 'individual' ? personalId : '',
            address,
            email,
            budgetUnitCode: buyerType === 'organization' ? budgetUnitCode : '',
            saveProfile,
          }
        : { wantsInvoice: false };
      return invoiceApi.save(orderId, body);
    },
    onSuccess: () => {
      setOpen(false);
      setMsg(t('inv.saved'));
      void qc.invalidateQueries({ queryKey: ['invoice', orderId] });
    },
    onError: (e) => setMsg(getErrorMessage(e as Error, language)),
  });

  const inv = q.data?.invoice;
  if (!orderId || q.isLoading || !inv) return null;

  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: 12, padding: 14, marginTop: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontWeight: '800' }}>{t('inv.title')}</Text>
        <Text style={{ color: inv.status === 'issued' ? '#15803d' : '#c2410c', fontWeight: '700', fontSize: 12 }}>{t(`inv.status.${inv.status}`)}</Text>
      </View>
      <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
        {inv.wantsInvoice ? `${t(`inv.type.${inv.buyerType}`)}: ${inv.buyerName}${inv.taxCode ? ` · ${inv.taxCode}` : ''}` : t('inv.none')}
      </Text>
      {inv.status === 'issued' ? (
        <View style={{ marginTop: 6 }}>
          <Text style={{ color: colors.text }}>{t('inv.issuedLine', { series: inv.invoiceSeries || '', number: inv.invoiceNumber || '—' })}</Text>
          {inv.hasPdf ? (
            <Pressable onPress={() => void invoiceApi.pdfUrl(orderId).then((r) => Linking.openURL(r.url))}>
              <Text style={{ color: colors.tint, fontWeight: '700', marginTop: 4 }}>{t('inv.viewPdf')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : !inv.editable ? (
        <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: 12 }}>{t('inv.locked')}</Text>
      ) : !open ? (
        <>
          <Button title={t(inv.wantsInvoice ? 'inv.change' : 'inv.request')} variant="outline" onPress={() => setOpen(true)} style={{ marginTop: 10 }} />
          {inv.editableUntil ? (
            <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: 12 }}>
              {t('inv.until', { time: formatDate(inv.editableUntil, language) })}
            </Text>
          ) : null}
        </>
      ) : (
        <View style={{ marginTop: 10, gap: 8 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label={t('inv.choice.no')} active={!wants} onPress={() => setWants(false)} />
            <Chip label={t('inv.choice.yes')} active={wants} onPress={() => setWants(true)} />
          </View>
          {wants ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Chip label={t('inv.type.organization')} active={buyerType === 'organization'} onPress={() => setBuyerType('organization')} />
                <Chip label={t('inv.type.individual')} active={buyerType === 'individual'} onPress={() => setBuyerType('individual')} />
              </View>
              <Input label={t(buyerType === 'organization' ? 'inv.companyName' : 'inv.fullName')} value={buyerName} onChangeText={setBuyerName} />
              {buyerType === 'organization' ? (
                <>
                  <Input label={t('inv.taxCode')} value={taxCode} onChangeText={setTaxCode} placeholder="0312345678 / 0312345678-001" />
                  <Input label={t('inv.budgetUnitCode')} value={budgetUnitCode} onChangeText={setBudgetUnitCode} />
                </>
              ) : (
                <Input label={t('inv.personalId')} value={personalId} onChangeText={setPersonalId} keyboardType="number-pad" />
              )}
              <Input label={t('inv.address')} value={address} onChangeText={setAddress} />
              <Input label={t('inv.email')} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Switch value={saveProfile} onValueChange={setSaveProfile} />
                <Text style={{ color: colors.text }}>{t('inv.saveProfile')}</Text>
              </View>
            </>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t('inv.noneHint')}</Text>
          )}
          <Button title={t('inv.save')} loading={save.isPending} onPress={() => save.mutate()} />
          <Button title={t('inv.cancel')} variant="outline" onPress={() => setOpen(false)} />
        </View>
      )}
      {msg ? <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 12 }}>{msg}</Text> : null}
    </View>
  );
}
