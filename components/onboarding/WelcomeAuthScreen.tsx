import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmail } from '../../services/auth';
import { colors } from '../ui';

/**
 * Screen 1 — Welcome / auth entry. Branded splash with Sign Up / Log In and
 * (visual-only) social buttons. Tapping a primary button reveals email +
 * password, then runs the repo's existing auto sign-in/create.
 * Auth state change advances the app (handled in App.tsx).
 */
export const WelcomeAuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'idle' | 'signup' | 'login'>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      // AuthContext picks up the new user and App.tsx routes onward.
    } catch (e: any) {
      const code = e?.code as string | undefined;
      setError(
        code === 'auth/wrong-password'
          ? 'Incorrect password for this email.'
          : code === 'auth/invalid-email'
            ? 'That email looks invalid.'
            : code === 'auth/weak-password'
              ? 'Password must be at least 6 characters.'
              : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: '#171B24' }}>
      <StatusBar barStyle="light-content" />
      {/* Darkened "hero" panel — stands in for the food photo in the mockup. */}
      <View
        className="absolute left-0 right-0 top-0"
        style={{ height: '62%', backgroundColor: '#222A38' }}
      />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          className="flex-1 justify-end px-7 pb-8"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Brand */}
          <View className="mb-auto mt-4 flex-row items-center" style={{ gap: 8 }}>
            <View
              className="h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.white }}>
              <Ionicons name="restaurant" size={15} color={colors.ink} />
            </View>
            <Text className="text-base font-semibold text-white">MealBody</Text>
          </View>

          {/* Headline */}
          <Text style={{ color: colors.white, fontSize: 38, fontWeight: '900', lineHeight: 42 }}>
            Decide{'\n'}what to eat.
          </Text>
          <Text style={{ color: '#9FB1F5', fontSize: 38, fontWeight: '900', lineHeight: 42 }}>
            Learn how your{'\n'}body responds.
          </Text>
          <Text style={{ color: '#AEB6C6', fontSize: 14, marginTop: 14, lineHeight: 20 }}>
            Become smarter about your meal choices — by learning what feels good for your body and
            mind.
          </Text>

          {/* Auth */}
          <View className="mt-7" style={{ gap: 12 }}>
            {mode !== 'idle' && (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#8A93A6"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={inputStyle}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#8A93A6"
                  secureTextEntry
                  style={inputStyle}
                />
              </View>
            )}

            {error ? <Text style={{ color: '#FF9B9B', fontSize: 13 }}>{error}</Text> : null}

            <TouchableOpacity
              onPress={mode === 'idle' ? () => setMode('signup') : submit}
              activeOpacity={0.85}
              disabled={loading}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 999,
                paddingVertical: 16,
                alignItems: 'center',
              }}>
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text className="text-base font-semibold text-white">
                  {mode === 'login' ? 'Log in' : "Sign up — it's free"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setError(null);
                setMode(mode === 'login' ? 'signup' : 'login');
              }}
              activeOpacity={0.7}
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 999,
                paddingVertical: 16,
                alignItems: 'center',
              }}>
              <Text className="text-base font-medium text-white">
                {mode === 'login' ? 'New here? Sign up' : 'Log in'}
              </Text>
            </TouchableOpacity>

            <Text
              className="my-1 text-center text-xs"
              style={{ color: '#7A8499', letterSpacing: 1 }}>
              OR CONTINUE WITH
            </Text>
            <View className="flex-row" style={{ gap: 12 }}>
              <SocialButton icon="logo-google" label="Google" />
              <SocialButton icon="logo-facebook" label="Facebook" />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const inputStyle = {
  backgroundColor: 'rgba(255,255,255,0.1)',
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 14,
  color: '#FFFFFF',
  fontSize: 15,
} as const;

// Visual-only — only email auth exists in this build.
const SocialButton: React.FC<{ icon: any; label: string }> = ({ icon, label }) => (
  <View
    className="flex-1 flex-row items-center justify-center"
    style={{
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 999,
      paddingVertical: 14,
      gap: 8,
    }}>
    <Ionicons name={icon} size={18} color="#FFFFFF" />
    <Text className="text-sm font-medium text-white">{label}</Text>
  </View>
);
