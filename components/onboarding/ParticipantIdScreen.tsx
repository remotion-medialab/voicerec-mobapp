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

interface ParticipantIdScreenProps {
  onNext: (participantId: string) => void;
  onBack: () => void;
  progress: number;
}

export const ParticipantIdScreen: React.FC<ParticipantIdScreenProps> = ({
  onNext,
  onBack,
  progress,
}) => {
  const [participantId, setParticipantId] = useState('');

  const handleNext = () => {
    if (participantId.trim()) {
      onNext(participantId.trim());
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Status bar area */}
      <View className="px-6 pt-12">
        <Text className="text-lg font-medium text-black">9:41</Text>
      </View>

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
            Next, please enter{'\n'}
            your participant ID
          </Text>

          <View className="w-full">
            <TextInput
              className="h-14 w-full rounded-2xl border border-gray-200 bg-white px-4 text-lg text-gray-800"
              placeholder="Enter your response here"
              placeholderTextColor="#9CA3AF"
              value={participantId}
              onChangeText={setParticipantId}
              autoCapitalize="none"
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
            participantId.trim() ? 'bg-blue-500' : 'bg-gray-300'
          }`}
          activeOpacity={0.8}
          disabled={!participantId.trim()}>
          <Text
            className={`text-center text-lg font-medium ${
              participantId.trim() ? 'text-white' : 'text-gray-500'
            }`}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
