import { Link, Stack } from 'expo-router';
import { View, Text, Image } from 'react-native';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  const { t } = useT();
  return (
    <>
      <Stack.Screen options={{ title: '404' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 24 }}>
        <Image source={require('@/assets/images/mark.png')} style={{ width: 64, height: 64, borderRadius: 14, marginBottom: 16 }} />
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{t('common.empty')}</Text>
        <Link href="/" style={{ marginTop: 16, backgroundColor: colors.tint, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }}>
          <Text style={{ color: colors.tintText, fontWeight: '800' }}>{t('nav.home')}</Text>
        </Link>
      </View>
    </>
  );
}
