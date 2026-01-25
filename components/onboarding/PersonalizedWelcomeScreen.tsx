import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';

interface PersonalizedWelcomeScreenProps {
  name: string;
  onBeginTutorial: () => void;
  onSkip: () => void;
  progress: number;
}

export const PersonalizedWelcomeScreen: React.FC<PersonalizedWelcomeScreenProps> = ({
  name,
  onBeginTutorial,
  onSkip,
  progress,
}) => {
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Progress bar with proper top spacing for iPhone */}
      <View className="mt-12 px-6 pt-2">
        <View className="h-1 rounded-full bg-gray-200">
          <View className="h-1 rounded-full bg-blue-500" style={{ width: `${progress}%` }} />
        </View>
      </View>

      {/* Main content */}
      <View className="flex-1 justify-center px-8">
        <View className="items-center">
          <Text className="text-center text-3xl font-light leading-relaxed text-blue-500">
            Welcome!{'\n'}
            Let&apos;s get started.
          </Text>
        </View>
      </View>

      {/* Navigation buttons */}
      <View className="flex-row justify-between px-8 pb-12">
        <TouchableOpacity
          onPress={onSkip}
          className="mr-4 flex-1 rounded-full border-2 border-blue-500 bg-transparent px-8 py-3"
          activeOpacity={0.8}>
          <Text className="text-center text-lg font-medium text-blue-500">{'Go \n Home'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onBeginTutorial}
          className="ml-4 flex-1 rounded-full bg-blue-500 px-8 py-3"
          activeOpacity={0.8}>
          <Text className="text-center text-lg font-medium text-white">Begin Tutorial</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
