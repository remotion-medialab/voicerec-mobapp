import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ReflectionShell } from './ReflectionShell';
import { FEELING_OPTIONS } from '../../../types/food';

interface Props {
  onNext: (feelings: string[]) => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

export function FeelingScreen({ onNext, onBack, step, totalSteps }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (f: string) =>
    setSelected((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  return (
    <ReflectionShell
      title="How did it feel?"
      subtitle="How did your body and mind feel after eating?"
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={() => onNext(selected)}>
      <View style={styles.chips}>
        {FEELING_OPTIONS.map((f) => {
          const active = selected.includes(f);
          return (
            <TouchableOpacity
              key={f}
              onPress={() => toggle(f)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.8}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ReflectionShell>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
  },
  chipActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  chipText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  chipTextActive: { color: '#6366f1' },
});
