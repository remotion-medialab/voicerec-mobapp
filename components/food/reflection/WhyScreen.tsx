import React, { useState } from 'react';
import { TextInput, StyleSheet } from 'react-native';
import { ReflectionShell } from './ReflectionShell';

interface Props {
  onNext: (text: string) => void;
  onBack: () => void;
  step: number;
  totalSteps: number;
}

export function WhyScreen({ onNext, onBack, step, totalSteps }: Props) {
  const [text, setText] = useState('');

  return (
    <ReflectionShell
      title="Why, do you think?"
      subtitle="What might have caused this outcome? No pressure — just whatever comes to mind."
      step={step}
      totalSteps={totalSteps}
      onBack={onBack}
      onNext={() => onNext(text)}
      nextLabel={text.trim() ? 'Next' : 'Skip'}>
      <TextInput
        style={styles.input}
        multiline
        placeholder="I think I was really stressed today, which made me eat faster than usual…"
        placeholderTextColor="#94a3b8"
        value={text}
        onChangeText={setText}
        textAlignVertical="top"
      />
    </ReflectionShell>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    minHeight: 160,
    fontSize: 16,
    color: '#0f172a',
    lineHeight: 24,
    marginTop: 8,
  },
});
