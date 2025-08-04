import React from 'react';
import { View } from 'react-native';

// Icon for "Capture moments that linger in your mind"
export const BrainIcon: React.FC = () => (
  <View className="h-24 w-24 items-center justify-center">
    {/* Head outline */}
    <View className="relative h-20 w-20 rounded-3xl border-2 border-blue-500">
      {/* Brain pattern - concentric circles */}
      <View className="absolute left-3 top-3 h-14 w-14 rounded-full border-2 border-blue-500" />
      <View className="absolute left-5 top-5 h-10 w-10 rounded-full border-2 border-blue-500" />
      <View className="absolute left-7 top-7 h-6 w-6 rounded-full border-2 border-blue-500" />
      <View className="absolute left-8 top-8 h-4 w-4 rounded-full bg-blue-500" />
    </View>
  </View>
);

// Icon for "Speak your thoughts - no need to type"
export const SpeechIcon: React.FC = () => (
  <View className="h-24 w-24 flex-row items-center justify-center">
    {/* Head profile */}
    <View className="relative mr-2 h-16 w-16 rounded-full border-2 border-blue-500">
      {/* Mouth area */}
      <View className="absolute right-0 top-1/2 h-1 w-4 rounded-full bg-blue-500" />
    </View>

    {/* Sound waves */}
    <View className="ml-1">
      <View className="mb-1 h-4 w-1 rounded-full bg-blue-500" />
      <View className="mb-1 h-6 w-1 rounded-full bg-blue-500" />
      <View className="h-4 w-1 rounded-full bg-blue-500" />
    </View>

    {/* Phone */}
    <View className="ml-2 h-12 w-8 items-center justify-center rounded-lg border-2 border-blue-500">
      <View className="mb-6 h-1 w-4 rounded-full bg-blue-500" />
      <View className="h-2 w-2 rounded-full bg-blue-500" />
    </View>
  </View>
);

// Icon for "Reflect on your day later with clarity"
export const ReflectIcon: React.FC = () => (
  <View className="h-24 w-24 flex-row items-center justify-center">
    {/* Head profile */}
    <View className="relative mr-4 h-16 w-16 rounded-full border-2 border-blue-500" />

    {/* Laptop */}
    <View className="items-center">
      {/* Screen */}
      <View className="h-8 w-10 rounded-t-lg border-2 border-blue-500" />
      {/* Base */}
      <View className="h-2 w-12 rounded-b-lg border-2 border-t-0 border-blue-500" />
    </View>
  </View>
);
