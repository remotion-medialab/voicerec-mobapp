import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onContinue: (moodText: string) => void;
  onBack: () => void;
}

const QUICK_MOODS = [
  'Something light', 'Comfort food', 'Quick & easy', 'Treat myself',
  'Healthy', 'Something new',
];

export function MealMoodScreen({ onContinue, onBack }: Props) {
  const [text, setText] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New entry</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>What are you in the mood for? 🍽️</Text>
          <Text style={styles.subtitle}>
            Tell your companion what you're craving or how you're feeling — it'll help you decide
            what to eat.
          </Text>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              multiline
              placeholder="I'm pretty hungry after a long day, want something filling but not too heavy…"
              placeholderTextColor="#94a3b8"
              value={text}
              onChangeText={setText}
              textAlignVertical="top"
            />
          </View>

          <Text style={styles.quickLabel}>Quick pick</Text>
          <View style={styles.quickChips}>
            {QUICK_MOODS.map((mood) => (
              <TouchableOpacity
                key={mood}
                style={[styles.chip, text === mood && styles.chipActive]}
                onPress={() => setText(mood)}
                activeOpacity={0.8}>
                <Text style={[styles.chipText, text === mood && styles.chipTextActive]}>{mood}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btn, !text.trim() && styles.btnDisabled]}
            onPress={() => onContinue(text.trim())}
            disabled={!text.trim()}
            activeOpacity={0.85}>
            <Text style={styles.btnText}>Chat with companion</Text>
            <Ionicons name="sparkles" size={18} color="#ffffff" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  kav: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a', lineHeight: 34, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', lineHeight: 22, marginBottom: 24 },
  inputWrapper: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
    minHeight: 120,
    marginBottom: 24,
  },
  input: { fontSize: 16, color: '#0f172a', lineHeight: 24 },
  quickLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  chipActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  chipText: { fontSize: 13, color: '#64748b' },
  chipTextActive: { color: '#6366f1', fontWeight: '500' },
  footer: { padding: 24 },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnDisabled: { backgroundColor: '#c7d2fe' },
  btnText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
});
