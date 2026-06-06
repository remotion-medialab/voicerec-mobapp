import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ReflectionShell } from './ReflectionShell';

interface Props {
  onNext: (rating: number) => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

const RATINGS = [1, 2, 3, 4, 5, 6] as const;
const RATING_LABELS: Record<number, string> = {
  1: 'Terrible', 2: 'Not great', 3: 'Okay', 4: 'Good', 5: 'Great', 6: 'Amazing',
};

export function HowAreYouScreen({ onNext, onBack, step, totalSteps }: Props) {
  const [rating, setRating] = useState<number | null>(null);

  return (
    <ReflectionShell
      title="How are you actually?"
      subtitle="Overall mood right now — not just about the food."
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={() => rating !== null && onNext(rating)}
      nextDisabled={rating === null}>
      <View style={styles.numbers}>
        {RATINGS.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => setRating(r)}
            style={[styles.numBtn, rating === r && styles.numBtnActive]}
            activeOpacity={0.8}>
            <Text style={[styles.numText, rating === r && styles.numTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {rating !== null && (
        <Text style={styles.ratingLabel}>{RATING_LABELS[rating]}</Text>
      )}
    </ReflectionShell>
  );
}

const styles = StyleSheet.create({
  numbers: { flexDirection: 'row', gap: 12, marginTop: 24 },
  numBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  numBtnActive: { borderColor: '#6366f1', backgroundColor: '#6366f1' },
  numText: { fontSize: 18, fontWeight: '600', color: '#64748b' },
  numTextActive: { color: '#ffffff' },
  ratingLabel: { fontSize: 15, color: '#6366f1', fontWeight: '500', marginTop: 12 },
});
