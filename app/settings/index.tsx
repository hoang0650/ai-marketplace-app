import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import type { ThemeMode } from '@/theme/tokens';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t, language } = useT();
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);

  const Option = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} style={{ paddingVertical: 14, minHeight: 48, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.text }}>{label}</Text>
      {active ? <Text style={{ color: colors.tint, fontWeight: '800' }}>●</Text> : null}
    </Pressable>
  );

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 8 }}>{t('settings.title')}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 16, fontWeight: '800' }}>{t('settings.appearance')}</Text>
      {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
        <Option key={m} label={t(`settings.theme.${m}`)} active={themeMode === m} onPress={() => setThemeMode(m)} />
      ))}
      <Text style={{ color: colors.textSecondary, marginTop: 16, fontWeight: '800' }}>{t('settings.language')}</Text>
      <Option label="Tiếng Việt" active={language === 'vi'} onPress={() => setLanguage('vi')} />
      <Option label="English" active={language === 'en'} onPress={() => setLanguage('en')} />
      <Text style={{ color: colors.textSecondary, marginTop: 16, fontWeight: '800' }}>{t('settings.currency')}</Text>
      <Option label="USD" active={currency === 'USD'} onPress={() => setCurrency('USD')} />
      <Option label="VND" active={currency === 'VND'} onPress={() => setCurrency('VND')} />
    </Screen>
  );
}
