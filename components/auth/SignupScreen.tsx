import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { signUpWithEmailAndPassword } from '../../services/auth';

interface SignupScreenProps {
  onSwitchToLogin: () => void;
}

export const SignupScreen: React.FC<SignupScreenProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !displayName || !participantId) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmailAndPassword(email, password, displayName);
      // Navigation will be handled by auth state change
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-gray-900">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 justify-center px-8 py-12">
          <Text className="mb-8 text-center text-4xl font-bold text-white">Create Account</Text>

          <View className="space-y-4">
            <TextInput
              className="rounded-lg bg-gray-800 p-4 text-white"
              placeholder="Display Name"
              placeholderTextColor="#9ca3af"
              value={displayName}
              onChangeText={setDisplayName}
              editable={!loading}
            />

            <TextInput
              className="rounded-lg bg-gray-800 p-4 text-white"
              placeholder="Participant ID"
              placeholderTextColor="#9ca3af"
              value={participantId}
              onChangeText={setParticipantId}
              editable={!loading}
            />

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

            <TextInput
              className="rounded-lg bg-gray-800 p-4 text-white"
              placeholder="Confirm Password"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />

            <TouchableOpacity
              className={`${loading ? 'bg-blue-700' : 'bg-blue-600'} mt-6 rounded-lg p-4`}
              onPress={handleSignup}
              disabled={loading}>
              <Text className="text-center text-lg font-semibold text-white">
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onSwitchToLogin} disabled={loading} className="mt-4">
              <Text className="text-center text-blue-400">Already have an account? Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
