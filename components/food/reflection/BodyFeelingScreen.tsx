import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ReflectionShell } from './ReflectionShell';

interface Props {
  onNext: (value: number) => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

const LEVELS = [
  { value: 10, label: 'Very unwell', emoji: '😣' },
  { value: 30, label: 'Not good', emoji: '😕' },
  { value: 50, label: 'Neutral', emoji: '😐' },
  { value: 70, label: 'Pretty good', emoji: '🙂' },
  { value: 90, label: 'Great', emoji: '😄' },
];

export function BodyFeelingScreen({ onNext, onBack, step, totalSteps }: Props) {
  const [value, setValue] = useState<number | null>(null);

  return (
    <ReflectionShell
      title="How does your body feel right now?"
      subtitle="A quick check-in — how is your physical state after this meal?"
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={() => value !== null && onNext(value)}
      nextLabel="Save entry"
      nextDisabled={value === null}>
      <View style={styles.options}>
        {LEVELS.map((lvl) => (
          <TouchableOpacity
            key={lvl.value}
            style={[styles.option, value === lvl.value && styles.optionActive]}
            onPress={() => setValue(lvl.value)}
            activeOpacity={0.8}>
            <Text style={styles.emoji}>{lvl.emoji}</Text>
            <Text style={[styles.optionLabel, value === lvl.value && styles.optionLabelActive]}>
              {lvl.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ReflectionShell>
  );
}

const styles = StyleSheet.create({
  options: { gap: 10, marginTop: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  optionActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  emoji: { fontSize: 28 },
  optionLabel: { fontSize: 16, color: '#64748b', fontWeight: '500' },
  optionLabelActive: { color: '#6366f1' },
});
