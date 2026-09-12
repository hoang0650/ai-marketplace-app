import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { workApi } from '@/api';
import { href } from '@/lib/href';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useT';
import { useT } from '@/hooks/useT';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LoginPrompt } from '@/components/ui/LoginPrompt';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({
  title: z.string().min(3).max(160),
  company: z.string().min(2).max(120),
  location: z.string().max(120).optional(),
  description: z.string().min(16).max(4000),
});

export default function WorkPostScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, language } = useT();
  const { isAuthenticated } = useAuth();
  const [error, setError] = useState('');
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { title: '', company: '', location: 'Remote', description: '' },
  });

  if (!isAuthenticated) {
    return (
      <Screen>
        <Stack.Screen options={{ title: t('work.postJob') }} />
        <LoginPrompt />
      </Screen>
    );
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      setError('');
      const job = await workApi.postJob({ ...values, remote: true });
      router.replace(href(`/work/job/${job.slug}`));
    } catch (e) {
      setError(getErrorMessage(e, language));
    }
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: t('work.postJob') }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Text style={[styles.lede, { color: colors.textSecondary }]}>{t('work.postJobDesc')}</Text>
        <Controller control={form.control} name="title" render={({ field, fieldState }) => <Input label={t('work.form.title')} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        <Controller control={form.control} name="company" render={({ field, fieldState }) => <Input label={t('work.form.company')} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        <Controller control={form.control} name="location" render={({ field, fieldState }) => <Input label={t('work.form.location')} value={field.value} onChangeText={field.onChange} error={fieldState.error?.message} />} />
        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Input
              label={t('work.form.description')}
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={{ minHeight: 120 }}
            />
          )}
        />
        {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}
        <Button title={t('work.form.submit')} onPress={onSubmit} loading={form.formState.isSubmitting} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lede: { fontSize: 14, lineHeight: 20, marginBottom: 16, marginTop: 8 },
});
