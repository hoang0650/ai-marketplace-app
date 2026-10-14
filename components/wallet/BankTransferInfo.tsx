import React from 'react';
import { Pressable, Text, View, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { walletApi } from '@/api';
import { useTheme } from '@/hooks/useT';
import { GPAY_ENABLED } from '@/lib/features';

/** Optional bank-transfer info (IAP remains the in-app top-up). Full VietQR is on the website. */
export function BankTransferInfo() {
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ['bank-transfer-config'], queryFn: () => walletApi.bankTransferConfig() });
  const c = q.data;
  if (!c?.enabled) return null;
  const copy = async (v: string) => {
    try {
      await Clipboard.setStringAsync(v);
    } catch {
      /* ignore */
    }
  };
  return (
    <View style={{ marginTop: 20, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Chuyển khoản ngân hàng (VietQR)</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 6, fontSize: 13, lineHeight: 19 }}>
        Trong app vui lòng nạp qua IAP ở trên. Hoặc chuyển khoản qua website aimarkets.vn (ví) để có mã VietQR + nội dung đối soát.
      </Text>
      <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 12 }}>{c.bankName}</Text>
      <Pressable onPress={() => copy(c.accountNumber)}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18, marginTop: 2 }}>{c.accountNumber}</Text>
      </Pressable>
      <Text style={{ color: colors.text, marginTop: 4 }}>{c.accountName}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 12 }}>
        Sau khi chuyển khoản, vui lòng giữ biên lai. Ví được cộng trong vài phút đến vài giờ làm việc sau khi chúng tôi xác nhận.
      </Text>
      {GPAY_ENABLED ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          {[
            { k: 'vietqr', title: 'Chuyển khoản VietQR', sub: 'Quét mã, admin xác nhận', url: 'https://aimarkets.vn/wallet', tint: '#d6293e' },
            { k: 'gpay', title: 'GPay', sub: 'Cổng thanh toán, cộng ví tự động', url: 'https://aimarkets.vn/wallet?method=gpay', tint: '#1d4ed8' },
          ].map((m) => (
            <Pressable
              key={m.k}
              onPress={() => Linking.openURL(m.url)}
              style={{ flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}
            >
              <Text style={{ color: m.tint, fontWeight: '700' }}>{m.title}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{m.sub}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable onPress={() => Linking.openURL('https://aimarkets.vn/wallet')} style={{ marginTop: 10 }}>
          <Text style={{ color: '#c9a961', fontWeight: '600' }}>Mở ví trên web →</Text>
        </Pressable>
      )}
    </View>
  );
}
