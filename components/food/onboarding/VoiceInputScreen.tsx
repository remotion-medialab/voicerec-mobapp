import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProgressBar } from './ProgressBar';

interface Props {
  title: string;
  subtitle: string;
  placeholder: string;
  onNext: (text: string) => void;
  onBack: () => void;
  progress: number;
}

export function VoiceInputScreen({ title, subtitle, placeholder, onNext, onBack, progress }: Props) {
  const [text, setText] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <ProgressBar progress={progress} onBack={onBack} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            multiline
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.hint}>Type freely — no wrong answers</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextBtn, !text.trim() && styles.nextBtnDisabled]}
          onPress={() => onNext(text.trim())}
          disabled={!text.trim()}
          activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a', lineHeight: 36, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', lineHeight: 22, marginBottom: 28 },
  inputWrapper: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    minHeight: 160,
  },
  input: { fontSize: 16, color: '#0f172a', lineHeight: 24, flex: 1 },
  hint: { fontSize: 13, color: '#94a3b8', marginTop: 12 },
  footer: { padding: 24 },
  nextBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: '#c7d2fe' },
  nextBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
});
