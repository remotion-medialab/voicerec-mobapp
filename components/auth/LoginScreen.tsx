import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { signIn } from '../../services/auth';

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
      await signIn(email, password);
      // Navigation will be handled by auth state change
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.message || 'An error occurred during login'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-900"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-4xl font-bold text-white text-center mb-8">
          Welcome Back
        </Text>

        <View className="space-y-4">
          <TextInput
            className="bg-gray-800 text-white p-4 rounded-lg"
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <TextInput
            className="bg-gray-800 text-white p-4 rounded-lg"
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            className={`${
              loading ? 'bg-blue-700' : 'bg-blue-600'
            } p-4 rounded-lg mt-6`}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-white text-center font-semibold text-lg">
              {loading ? 'Logging in...' : 'Log In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSwitchToSignup}
            disabled={loading}
            className="mt-4"
          >
            <Text className="text-blue-400 text-center">
              Don't have an account? Sign up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};