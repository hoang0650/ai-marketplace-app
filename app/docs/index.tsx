import React from 'react';
import { Linking, ScrollView, Text } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/studio/kit';
import { useTheme } from '@/hooks/useT';

export default function Docs() {
  const { colors } = useTheme();
  return <Screen><ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
    <Text style={{ color: colors.text, fontSize: 26, marginTop: 20 }}>Tài liệu AI Markets</Text>
    <Card><Text style={{ color: colors.textSecondary }}>Tài liệu dùng chung với web, luôn lấy phiên bản hiện hành từ sàn.</Text>
      <Button title="Cấu hình node server game & Remote Desktop" onPress={() => Linking.openURL('https://www.aimarkets.vn/docs/compute-streaming')} />
      <Button title="API gateway, token usage & tính phí" onPress={() => Linking.openURL('https://www.aimarkets.vn/docs/api-usage')} />
      <Button variant="outline" title="Tất cả tài liệu" onPress={() => Linking.openURL('https://www.aimarkets.vn/docs')} />
    </Card>
  </ScrollView></Screen>;
}
