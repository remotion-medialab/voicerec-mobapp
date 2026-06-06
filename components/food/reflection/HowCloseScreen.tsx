import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { ReflectionShell } from './ReflectionShell';

interface Props {
  onNext: (value: number) => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

export function HowCloseScreen({ onNext, onBack, step, totalSteps }: Props) {
  const [value, setValue] = useState(50);

  return (
    <ReflectionShell
      title="How close were you?"
      subtitle="Did this meal match what you actually wanted?"
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={() => onNext(value)}>
      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={value}
          onValueChange={setValue}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#e2e8f0"
          thumbTintColor="#6366f1"
        />
        <Text style={styles.valueText}>{value}</Text>
        <View style={styles.labels}>
          <Text style={styles.labelLeft}>Not at all</Text>
          <Text style={styles.labelRight}>Exactly right</Text>
        </View>
      </View>
    </ReflectionShell>
  );
}

const styles = StyleSheet.create({
  sliderWrapper: { marginTop: 32, alignItems: 'center' },
  slider: { width: '100%', height: 40 },
  valueText: { fontSize: 48, fontWeight: '700', color: '#6366f1', marginTop: 8 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 4 },
  labelLeft: { fontSize: 12, color: '#94a3b8' },
  labelRight: { fontSize: 12, color: '#94a3b8' },
});
