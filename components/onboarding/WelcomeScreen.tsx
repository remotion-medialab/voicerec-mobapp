import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StatusBar } from 'react-native';

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

  // Create dots pattern similar to the mockup
  const renderDotsPattern = () => {
    const dots: React.ReactElement[] = [];
    const dotPositions = [
      // Main cluster in center
      { top: 280, left: 185, size: 16 }, // Center large dot
      { top: 260, left: 165, size: 8 },
      { top: 270, left: 205, size: 8 },
      { top: 300, left: 160, size: 8 },
      { top: 310, left: 190, size: 8 },
      { top: 320, left: 210, size: 8 },

      // Surrounding dots in circular pattern
      { top: 220, left: 140, size: 8 },
      { top: 230, left: 170, size: 6 },
      { top: 240, left: 200, size: 8 },
      { top: 250, left: 230, size: 6 },
      { top: 270, left: 250, size: 8 },
      { top: 300, left: 260, size: 6 },
      { top: 330, left: 250, size: 8 },
      { top: 360, left: 230, size: 6 },
      { top: 380, left: 200, size: 8 },
      { top: 390, left: 170, size: 6 },
      { top: 380, left: 140, size: 8 },
      { top: 360, left: 120, size: 6 },
      { top: 330, left: 110, size: 8 },
      { top: 300, left: 100, size: 6 },
      { top: 270, left: 110, size: 8 },
      { top: 240, left: 120, size: 6 },

      // Outer scattered dots
      { top: 180, left: 100, size: 6 },
      { top: 200, left: 280, size: 6 },
      { top: 150, left: 200, size: 6 },
      { top: 420, left: 150, size: 6 },
      { top: 440, left: 220, size: 6 },
      { top: 160, left: 250, size: 6 },
      { top: 450, left: 180, size: 6 },

      // Additional scattered dots
      { top: 120, left: 120, size: 4 },
      { top: 140, left: 300, size: 4 },
      { top: 480, left: 140, size: 4 },
      { top: 500, left: 200, size: 4 },
      { top: 110, left: 250, size: 4 },
    ];

    dotPositions.forEach((dot, index) => {
      dots.push(
        <View
          key={index}
          className="absolute rounded-full bg-blue-500"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
          }}
        />
      );
    });

    return dots;
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Main content */}
      <View className="flex-1 items-center justify-center px-6">
        <Animated.View
          className="relative"
          style={{
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}>
          {/* Dots pattern */}
          <View className="absolute -left-20 -top-20">{renderDotsPattern()}</View>

          {/* Main content */}
          <View className="mt-40 items-center">
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
