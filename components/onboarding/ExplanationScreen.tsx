import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';

interface ExplanationScreenProps {
  stepNumber: number;
  title: string;
  description?: string;
  icon: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  progress: number;
}

export const ExplanationScreen: React.FC<ExplanationScreenProps> = ({
  stepNumber,
  title,
  description,
  icon,
  onNext,
  onBack,
  progress,
}) => {
  return (
    <View className="flex-1 bg-gray-50">
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
        <View className="items-center">
          {/* Title */}
          <Text className="mb-8 text-center text-2xl font-light text-blue-500">
            How does this work?
          </Text>

          {/* Step number */}
          <View className="mb-12 h-16 w-16 items-center justify-center rounded-full border-2 border-blue-500 bg-transparent">
            <Text className="text-2xl font-light text-blue-500">{stepNumber}</Text>
          </View>

          {/* Description */}
          <Text className="mb-16 px-4 text-center text-2xl font-light leading-relaxed text-blue-500">
            {title}
          </Text>

          {/* Icon */}
          <View className="mb-16">{icon}</View>
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
          onPress={onNext}
          className="ml-4 flex-1 rounded-full bg-blue-500 px-8 py-3"
          activeOpacity={0.8}>
          <Text className="text-center text-lg font-medium text-white">Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
