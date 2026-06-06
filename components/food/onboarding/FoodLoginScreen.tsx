import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onNext: (email: string, password: string) => void;
  onBack: () => void;
  loading?: boolean;
  error?: string | null;
  mode: 'signup' | 'login';
}

export function FoodLoginScreen({ onNext, onBack, loading, error, mode }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isValid = email.trim().length > 0 && password.trim().length >= 6;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {mode === 'signup' ? 'Create your\naccount' : 'Welcome\nback'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signup'
              ? 'Your journal is private and secure'
              : 'Log in to access your food journal'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => isValid && onNext(email.trim(), password)}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btn, !isValid && styles.btnDisabled]}
            onPress={() => onNext(email.trim(), password)}
            disabled={!isValid || loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnText}>{mode === 'signup' ? 'Continue' : 'Log in'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  kav: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  title: { fontSize: 32, fontWeight: '700', color: '#0f172a', lineHeight: 40, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 32 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  error: { color: '#ef4444', fontSize: 14, marginTop: 4 },
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
