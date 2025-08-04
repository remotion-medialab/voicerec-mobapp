import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';

interface PermissionScreenProps {
  onAllow: () => void;
  onDeny: () => void;
}

export const PermissionScreen: React.FC<PermissionScreenProps> = ({ onAllow, onDeny }) => {
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Empty space above dialog */}
      <View className="flex-1" />

      {/* Permission dialog */}
      <View className="mx-8 mb-20">
        <View className="rounded-2xl bg-white p-6 shadow-lg">
          {/* Title */}
          <Text className="mb-2 text-center text-lg font-semibold text-gray-900">
            &quot;Re:Self&quot; Would Like to{'\n'}
            Access the Microphone
          </Text>

          {/* Description */}
          <Text className="mb-6 text-center text-sm leading-relaxed text-gray-600">
            Allow microphone access to record{'\n'}
            audio and create Live Titles.
          </Text>

          {/* Buttons */}
          <View className="flex-row">
            {/* Don't Allow button */}
            <TouchableOpacity
              onPress={onDeny}
              className="flex-1 border-r border-gray-200 py-3"
              activeOpacity={0.6}>
              <Text className="text-center text-lg font-medium text-blue-500">
                Don&apos;t Allow
              </Text>
            </TouchableOpacity>

            {/* Allow button */}
            <TouchableOpacity onPress={onAllow} className="flex-1 py-3" activeOpacity={0.6}>
              <Text className="text-center text-lg font-semibold text-blue-500">Allow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Blue arrow pointing up */}
      <View className="absolute bottom-32 right-12">
        <View className="items-center">
          {/* Arrow shaft */}
          <View className="h-16 w-1 bg-blue-500" />
          {/* Arrow head */}
          <View className="absolute -top-2">
            <View className="h-0 w-0 border-b-8 border-l-4 border-r-4 border-b-blue-500 border-l-transparent border-r-transparent" />
          </View>
        </View>
      </View>

      {/* Bottom space */}
      <View className="h-20" />
    </View>
  );
};
