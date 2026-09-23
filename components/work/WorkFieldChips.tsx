import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { workApi } from '@/api';
import { Chip } from '@/components/ui/Chip';
import { useT } from '@/hooks/useT';

type Props = {
  selected: string;
  onSelect: (fieldId: string) => void;
};

/** Flat child fields as horizontal chips (mobile stand-in for web sidebar). */
export function WorkFieldChips({ selected, onSelect }: Props) {
  const { t } = useT();
  const fieldsQ = useQuery({
    queryKey: ['work', 'fields'],
    queryFn: workApi.fields,
    staleTime: 300_000,
  });

  const chips = useMemo(() => {
    const rows: { id: string; label: string }[] = [];
    for (const g of fieldsQ.data || []) {
      for (const c of g.children || []) {
        rows.push({ id: c.id, label: c.label });
      }
    }
    return rows;
  }, [fieldsQ.data]);

  if (!chips.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        <Chip label={t('work.clearAll')} active={!selected} onPress={() => onSelect('')} />
        {chips.map((c) => (
          <Chip key={c.id} label={c.label} active={selected === c.id} onPress={() => onSelect(c.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  rail: { gap: 8, paddingRight: 8 },
});
