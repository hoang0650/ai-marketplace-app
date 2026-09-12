import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { RunpodField } from '@/lib/runpod-schema';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { useTheme } from '@/hooks/useT';

type Props = {
  field: RunpodField;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
};

function asString(values: Record<string, unknown>, key: string) {
  const value = values[key];
  return value === undefined || value === null ? '' : String(value);
}

function asNumber(values: Record<string, unknown>, key: string): string {
  const value = values[key];
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

function asList(values: Record<string, unknown>, key: string): string[] {
  const value = values[key];
  return Array.isArray(value) ? value.map(String) : [];
}

function asLoras(values: Record<string, unknown>, key: string): Array<{ path: string; scale: number }> {
  const value = values[key];
  return Array.isArray(value) ? (value as Array<{ path: string; scale: number }>) : [];
}

export function SchemaField({ field, values, onChange }: Props) {
  const { colors } = useTheme();
  const [listDraft, setListDraft] = useState('');
  const [loraDraft, setLoraDraft] = useState('');

  if (field.control === 'toggle') {
    return (
      <View style={styles.toggleRow}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={[styles.label, { color: colors.text }]}>{field.label}</Text>
          {field.help ? <Text style={[styles.help, { color: colors.textSecondary }]}>{field.help}</Text> : null}
        </View>
        <Switch value={!!values[field.key]} onValueChange={(v) => onChange(field.key, v)} />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{field.label}</Text>
        {field.required ? <Text style={styles.req}>Required</Text> : null}
      </View>
      {field.help ? <Text style={[styles.help, { color: colors.textSecondary }]}>{field.help}</Text> : null}

      {field.control === 'textarea' ? (
        <Input
          value={asString(values, field.key)}
          onChangeText={(v) => onChange(field.key, v)}
          multiline
          placeholder={field.required ? 'Required' : 'Optional'}
          style={styles.area}
        />
      ) : null}

      {field.control === 'chips' ? (
        <View style={styles.wrap}>
          {field.options.map((opt) => (
            <Chip
              key={String(opt.value)}
              label={opt.label}
              active={String(values[field.key]) === String(opt.value)}
              onPress={() => onChange(field.key, opt.value)}
            />
          ))}
        </View>
      ) : null}

      {field.control === 'select' ? (
        <View style={styles.wrap}>
          {field.options.map((opt) => (
            <Chip
              key={String(opt.value)}
              label={opt.label}
              active={String(values[field.key]) === String(opt.value)}
              onPress={() => onChange(field.key, opt.value)}
            />
          ))}
        </View>
      ) : null}

      {field.control === 'stepper' ? (
        <View style={styles.stepper}>
          <Pressable
            onPress={() => bump(field, values, onChange, -1)}
            style={[styles.stepBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>−</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Input
              value={asNumber(values, field.key)}
              onChangeText={(v) => onChange(field.key, v === '' ? '' : Number(v))}
              keyboardType="numeric"
            />
          </View>
          <Pressable
            onPress={() => bump(field, values, onChange, 1)}
            style={[styles.stepBtn, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>+</Text>
          </Pressable>
        </View>
      ) : null}

      {field.control === 'number' ? (
        <Input
          value={asNumber(values, field.key)}
          onChangeText={(v) => onChange(field.key, v === '' ? '' : Number(v))}
          keyboardType="numeric"
        />
      ) : null}

      {field.control === 'image' || field.control === 'mediaUrl' || field.control === 'text' ? (
        <>
          <Input
            value={asString(values, field.key)}
            onChangeText={(v) => onChange(field.key, v)}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={field.spec.format || 'https://'}
          />
          {field.control === 'image' && asString(values, field.key) ? (
            <Image source={{ uri: asString(values, field.key) }} style={styles.preview} contentFit="contain" />
          ) : null}
        </>
      ) : null}

      {field.control === 'imageList' ? (
        <>
          {asList(values, field.key).map((url, i) => (
            <View key={`${url}-${i}`} style={{ marginBottom: 8 }}>
              <Image source={{ uri: url }} style={styles.preview} contentFit="contain" />
              <Pressable onPress={() => onChange(field.key, asList(values, field.key).filter((_, idx) => idx !== i))}>
                <Text style={{ color: colors.tint, fontWeight: '700' }}>Remove</Text>
              </Pressable>
            </View>
          ))}
          <Input value={listDraft} onChangeText={setListDraft} autoCapitalize="none" placeholder="Paste an image URL" />
          <Pressable
            onPress={() => {
              const url = listDraft.trim();
              if (!url) return;
              onChange(field.key, [...asList(values, field.key), url]);
              setListDraft('');
            }}
          >
            <Text style={{ color: colors.tint, fontWeight: '700', marginBottom: 8 }}>Add</Text>
          </Pressable>
        </>
      ) : null}

      {field.control === 'loras' ? (
        <>
          {asLoras(values, field.key).map((lora, i) => (
            <Text key={`${lora.path}-${i}`} style={{ color: colors.textSecondary, marginBottom: 4 }}>
              {lora.path} · {lora.scale}
            </Text>
          ))}
          <Input value={loraDraft} onChangeText={setLoraDraft} autoCapitalize="none" placeholder="LoRA path or URL" />
          <Pressable
            onPress={() => {
              const path = loraDraft.trim();
              if (!path) return;
              onChange(field.key, [...asLoras(values, field.key), { path, scale: 1 }]);
              setLoraDraft('');
            }}
          >
            <Text style={{ color: colors.tint, fontWeight: '700' }}>Add LoRA</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function bump(field: RunpodField, values: Record<string, unknown>, onChange: (k: string, v: unknown) => void, dir: 1 | -1) {
  const step = field.spec.step ?? (field.spec.type === 'float' ? 0.1 : 1);
  const raw = Number(values[field.key] ?? field.spec.default ?? 0) + step * dir;
  const rounded = Math.round(raw * 1e6) / 1e6;
  const min = field.spec.min ?? Number.NEGATIVE_INFINITY;
  const max = field.spec.max ?? Number.POSITIVE_INFINITY;
  onChange(field.key, Math.min(max, Math.max(min, rounded)));
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  help: { fontSize: 12, lineHeight: 16, marginBottom: 8 },
  req: { color: '#c0392b', fontSize: 11, fontWeight: '700' },
  area: { minHeight: 100, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepper: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepBtn: {
    width: 44,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  preview: { width: '100%', height: 160, borderRadius: 10, backgroundColor: '#111', marginBottom: 8 },
});
