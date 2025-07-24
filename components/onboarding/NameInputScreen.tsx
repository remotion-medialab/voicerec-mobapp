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

interface NameInputScreenProps {
  onNext: (name: string) => void;
  onBack: () => void;
  progress: number;
}

export const NameInputScreen: React.FC<NameInputScreenProps> = ({ onNext, onBack, progress }) => {
  const [name, setName] = useState('');

  const handleNext = () => {
    if (name.trim()) {
      onNext(name.trim());
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Progress bar */}
      <View className="mt-4 px-6">
        <View className="h-1 rounded-full bg-gray-200">
          <View className="h-1 rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
        </View>
      </View>

      {/* Main content */}
      <View className="flex-1 justify-center px-8">
        <View className="items-start">
          <Text className="mb-8 text-3xl font-light leading-relaxed text-blue-500">
            First things first,{'\n'}
            what&apos;s your name?
          </Text>

          <View className="w-full">
            <TextInput
              className="h-14 w-full rounded-2xl border border-gray-200 bg-white px-4 text-lg text-gray-800"
              placeholder="Enter your response here"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
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
            name.trim() ? 'bg-blue-500' : 'bg-gray-300'
          }`}
          activeOpacity={0.8}
          disabled={!name.trim()}>
          <Text
            className={`text-center text-lg font-medium ${
              name.trim() ? 'text-white' : 'text-gray-500'
            }`}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
