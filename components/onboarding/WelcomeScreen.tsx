import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StatusBar, Image } from 'react-native';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Main content */}
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          className="items-center"
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}>
          {/* Progress circles diagram */}
          <View className="mb-16">
            <Image
              source={require('../../assets/intro.png')}
              style={{ width: 200, height: 200 }}
              resizeMode="contain"
            />
          </View>

          {/* Main content */}
          <View className="items-center">
            <Text className="mb-4 text-5xl font-light tracking-wider text-blue-500">RE:SELF</Text>
            <Text className="text-center text-lg text-blue-400">Welcome to your mind.</Text>
          </View>
        </Animated.View>
      </View>

      {/* Get Started button */}
      <View className="px-8 pb-12">
        <TouchableOpacity
          onPress={onGetStarted}
          className="rounded-full border-2 border-blue-500 bg-transparent px-8 py-4"
          activeOpacity={0.8}>
          <Text className="text-center text-lg font-medium text-blue-500">Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
