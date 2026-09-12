import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';

export function IapTopup() {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <View>
      <Text style={{ color: colors.textSecondary, marginTop: 20, lineHeight: 20 }}>{t('wallet.hint.web')}</Text>
    </View>
  );
}
