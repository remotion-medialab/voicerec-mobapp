import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RESTRICTION_OPTIONS } from '../../../types/food';
import { ProgressBar } from './ProgressBar';

interface Props {
  onNext: (restrictions: string[]) => void;
  onBack: () => void;
  progress: number;
}

export function FoodRestrictionsScreen({ onNext, onBack, progress }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (item: string) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((r) => r !== item) : [...prev, item]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar progress={progress} onBack={onBack} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Any food{'\n'}restrictions?</Text>
        <Text style={styles.subtitle}>Select all that apply — or skip</Text>

        <View style={styles.chips}>
          {RESTRICTION_OPTIONS.map((item) => {
            const active = selected.includes(item);
            return (
              <TouchableOpacity
                key={item}
                onPress={() => toggle(item)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={() => onNext(selected)} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>{selected.length === 0 ? 'Skip' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 28 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  footer: { padding: 24 },
  nextBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
});
