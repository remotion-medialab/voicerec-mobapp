import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { signInWithEmail } from '../../services/auth';

interface LoginScreenProps {
  onSwitchToSignup: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // Navigation will be handled by auth state change
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-900">
      <View className="flex-1 justify-center px-8">
        <Text className="mb-8 text-center text-4xl font-bold text-white">Welcome Back</Text>

        <View className="space-y-4">
          <TextInput
            className="rounded-lg bg-gray-800 p-4 text-white"
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            className="rounded-lg bg-gray-800 p-4 text-white"
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            className={`${loading ? 'bg-blue-700' : 'bg-blue-600'} mt-6 rounded-lg p-4`}
            onPress={handleLogin}
            disabled={loading}>
            <Text className="text-center text-lg font-semibold text-white">
              {loading ? 'Logging in...' : 'Log In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSwitchToSignup} disabled={loading} className="mt-4">
            <Text className="text-center text-blue-400">Don&apos;t have an account? Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
