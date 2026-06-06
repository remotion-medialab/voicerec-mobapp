import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  title: string;
  subtitle?: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: React.ReactNode;
}

export function ReflectionShell({
  title,
  subtitle,
  step,
  totalSteps,
  onBack,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  children,
}: Props) {
  const progress = (step / totalSteps) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#64748b" />
        </TouchableOpacity>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stepCount}>{step}/{totalSteps}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, nextDisabled && styles.btnDisabled]}
          onPress={onNext}
          disabled={nextDisabled}
          activeOpacity={0.85}>
          <Text style={styles.btnText}>{nextLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  track: { flex: 1, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2 },
  fill: { height: 4, backgroundColor: '#6366f1', borderRadius: 2 },
  stepCount: { fontSize: 12, color: '#94a3b8', fontWeight: '500', minWidth: 28 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a', lineHeight: 34, marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#64748b', lineHeight: 22, marginBottom: 24 },
  footer: { padding: 24 },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#c7d2fe' },
  btnText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
});
