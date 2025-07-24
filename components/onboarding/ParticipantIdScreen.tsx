import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface LoginScreenProps {
  onNext: (email: string, password: string) => void;
  onBack: () => void;
  progress: number;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNext, onBack, progress }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleNext = () => {
    if (email.trim() && password.trim()) {
      onNext(email.trim(), password.trim());
    }
  };

  const isValid = email.trim() && password.trim();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Progress bar with proper top spacing for iPhone */}
      <View className="mt-12 px-6 pt-2">
        <View className="h-1 rounded-full bg-gray-200">
          <View className="h-1 rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
        </View>
      </View>

      {/* Main content */}
      <View className="flex-1 justify-center px-8">
        <View className="items-start">
          <Text className="mb-8 text-3xl font-light leading-relaxed text-blue-500">
            Please enter your{'\n'}
            email and password.
          </Text>

          <View className="w-full space-y-4">
            <TextInput
              className="h-14 w-full rounded-2xl border border-gray-200 bg-white px-4 text-lg text-gray-800"
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
            />

            <TextInput
              className="h-14 w-full rounded-2xl border border-gray-200 bg-white px-4 text-lg text-gray-800"
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />

            <Text className="mt-2 text-sm text-gray-600">
              Your account will be used to securely access your recordings across sessions.
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation buttons */}
      <View className="flex-row justify-between px-8 pb-12">
        <TouchableOpacity
          onPress={onBack}
          className="mr-4 flex-1 rounded-full border-2 border-blue-500 bg-transparent px-8 py-3"
          activeOpacity={0.8}>
          <Text className="text-center text-lg font-medium text-blue-500">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNext}
          className={`ml-4 flex-1 rounded-full px-8 py-3 ${
            isValid ? 'bg-blue-500' : 'bg-gray-300'
          }`}
          activeOpacity={0.8}
          disabled={!isValid}>
          <Text
            className={`text-center text-lg font-medium ${
              isValid ? 'text-white' : 'text-gray-500'
            }`}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
