import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ReflectionShell } from './ReflectionShell';
import { TasteProfile, DEFAULT_TASTE_PROFILE } from '../../../types/food';

interface Props {
  onNext: (taste: TasteProfile) => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
  foodName: string;
}

const TASTE_KEYS: (keyof TasteProfile)[] = ['sweet', 'salty', 'savory', 'spicy', 'sour'];
const TASTE_LABELS: Record<keyof TasteProfile, string> = {
  sweet: '🍯 Sweet', salty: '🧂 Salty', savory: '🥩 Savory', spicy: '🌶️ Spicy', sour: '🍋 Sour',
};

const LEVELS = [0, 1, 2, 3, 4] as const;
const LEVEL_LABELS = ['None', 'Mild', 'Some', 'Strong', 'Intense'];

export function TasteRatingScreen({ onNext, onBack, step, totalSteps, foodName }: Props) {
  const [taste, setTaste] = useState<TasteProfile>({ ...DEFAULT_TASTE_PROFILE });

  const setLevel = (key: keyof TasteProfile, value: number) => {
    setTaste((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <ReflectionShell
      title="How did it taste?"
      subtitle={foodName}
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={() => onNext(taste)}>
      <View style={styles.rows}>
        {TASTE_KEYS.map((key) => (
          <View key={key} style={styles.row}>
            <Text style={styles.label}>{TASTE_LABELS[key]}</Text>
            <View style={styles.dots}>
              {LEVELS.map((lvl) => (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => setLevel(key, lvl)}
                  style={[styles.dot, taste[key] >= lvl && styles.dotActive]}
                  activeOpacity={0.7}
                />
              ))}
            </View>
            <Text style={styles.levelLabel}>{LEVEL_LABELS[taste[key]]}</Text>
          </View>
        ))}
      </View>
    </ReflectionShell>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 20, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 15, color: '#0f172a', width: 96 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e2e8f0' },
  dotActive: { backgroundColor: '#6366f1' },
  levelLabel: { fontSize: 12, color: '#94a3b8', width: 52 },
});
