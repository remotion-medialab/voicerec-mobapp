import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface WaveformProps {
  data: number[];
}

export const Waveform: React.FC<WaveformProps> = ({ data }) => {
  const animatedValues = useRef<Animated.Value[]>([]).current;

  // Initialize animated values for each bar
  useEffect(() => {
    if (animatedValues.length === 0) {
      for (let i = 0; i < 40; i++) {
        animatedValues.push(new Animated.Value(Math.random() * 0.5 + 0.1));
      }
    }
  }, [animatedValues]);

  // Animate the waveform bars
  useEffect(() => {
    const animateWaveform = () => {
      const animations = animatedValues.map((animValue, index) => {
        return Animated.timing(animValue, {
          toValue: Math.random() * 0.8 + 0.1,
          duration: 100 + Math.random() * 200,
          useNativeDriver: false,
        });
      });

      Animated.stagger(20, animations).start(() => {
        // Continue animation
        setTimeout(animateWaveform, 100);
      });
    };

    animateWaveform();
  }, [animatedValues]);

  const renderWaveformBars = () => {
    const bars: React.ReactElement[] = [];

    for (let i = 0; i < 40; i++) {
      const animatedHeight = animatedValues[i] || new Animated.Value(0.3);

      bars.push(
        <Animated.View
          key={i}
          className="mx-0.5 w-1 rounded-full bg-blue-500"
          style={{
            height: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 48],
            }),
          }}
        />
      );
    }

    return bars;
  };

  return (
    <View className="h-16 flex-row items-center justify-center px-4">{renderWaveformBars()}</View>
  );
};
