import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface WaveformProps {
  data: number[];
  isVisible?: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({ data, isVisible = true }) => {
  const animatedValues = useRef<Animated.Value[]>([]).current;
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize animated values for each bar
  useEffect(() => {
    if (animatedValues.length === 0) {
      for (let i = 0; i < 60; i++) {
        animatedValues.push(new Animated.Value(Math.random() * 0.3 + 0.1));
      }
    }
  }, [animatedValues]);

  // Animate the waveform bars when visible
  useEffect(() => {
    if (!isVisible) {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animateWaveform = () => {
      const animations = animatedValues.map((animValue, index) => {
        return Animated.timing(animValue, {
          toValue: Math.random() * 0.9 + 0.1,
          duration: 50 + Math.random() * 100,
          useNativeDriver: false,
        });
      });

      Animated.stagger(10, animations).start(() => {
        if (isVisible) {
          animationRef.current = setTimeout(animateWaveform, 50);
        }
      });
    };

    animateWaveform();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [animatedValues, isVisible]);

  const renderWaveformBars = () => {
    const bars: React.ReactElement[] = [];

    for (let i = 0; i < 60; i++) {
      const animatedHeight = animatedValues[i] || new Animated.Value(0.3);

      bars.push(
        <Animated.View
          key={i}
          style={[
            styles.waveformBar,
            {
              height: animatedHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 60],
              }),
            },
          ]}
        />
      );
    }

    return bars;
  };

  if (!isVisible) {
    return null;
  }

  return <View style={styles.container}>{renderWaveformBars()}</View>;
};

const styles = StyleSheet.create({
  container: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  waveformBar: {
    width: 2,
    backgroundColor: '#3b82f6',
    borderRadius: 1,
    marginHorizontal: 0.5,
  },
});
