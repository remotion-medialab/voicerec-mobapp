import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Image, Animated } from 'react-native';

interface ExplanationScreenProps {
  stepNumber: number;
  totalSteps: number;
  icon: string;
  title: string;
  subtitle?: string;
  imagePath: any;
  imageSize?: { width: number; height: number };
  imageBorderRadius?: number;
  onNext: () => void;
  onBack: () => void;
  progress: number;
}

const ICON_BG_COLORS = ['#dbeafe', '#d1fae5', '#fef3c7'];
const ICON_BORDER_COLORS = ['#93c5fd', '#6ee7b7', '#fcd34d'];

export const ExplanationScreen: React.FC<ExplanationScreenProps> = ({
  stepNumber,
  totalSteps,
  icon,
  title,
  subtitle,
  imagePath,
  imageSize = { width: 180, height: 180 },
  imageBorderRadius,
  onNext,
  onBack,
  progress,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    // Reset and re-animate on step change
    fadeAnim.setValue(0);
    slideAnim.setValue(24);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 90,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepNumber, fadeAnim, slideAnim]);

  const colorIdx = (stepNumber - 1) % 3;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Progress bar */}
      <View style={{ marginTop: 56, paddingHorizontal: 24 }}>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: '#e2e8f0' }}>
          <View
            style={{ height: 3, borderRadius: 2, backgroundColor: '#3b82f6', width: `${progress}%` }}
          />
        </View>
      </View>

      {/* Main content */}
      <Animated.View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 32,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
        {/* Step badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <View
            style={{
              backgroundColor: ICON_BG_COLORS[colorIdx],
              borderWidth: 1.5,
              borderColor: ICON_BORDER_COLORS[colorIdx],
              borderRadius: 20,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569', letterSpacing: 0.5 }}>
              STEP {stepNumber} OF {totalSteps}
            </Text>
          </View>
        </View>

        {/* Icon in circle */}
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: ICON_BG_COLORS[colorIdx],
            borderWidth: 2,
            borderColor: ICON_BORDER_COLORS[colorIdx],
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 3,
          }}>
          <Text style={{ fontSize: 32 }}>{icon}</Text>
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 26,
            fontWeight: '300',
            color: '#1e293b',
            lineHeight: 36,
            marginBottom: subtitle ? 12 : 32,
          }}>
          {title}
        </Text>

        {/* Subtitle */}
        {subtitle ? (
          <Text
            style={{
              fontSize: 15,
              color: '#64748b',
              lineHeight: 22,
              marginBottom: 32,
            }}>
            {subtitle}
          </Text>
        ) : null}

        {/* Image */}
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Image
            source={imagePath}
            style={{ width: imageSize.width, height: imageSize.height, borderRadius: imageBorderRadius ?? 0 }}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Step dots */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 20 }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={{
              width: i + 1 === stepNumber ? 20 : 7,
              height: 7,
              borderRadius: 4,
              backgroundColor: i + 1 === stepNumber ? '#3b82f6' : '#cbd5e1',
            }}
          />
        ))}
      </View>

      {/* Navigation buttons */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 24,
          paddingBottom: 44,
          gap: 12,
        }}>
        <TouchableOpacity
          onPress={onBack}
          style={{
            flex: 1,
            borderRadius: 30,
            borderWidth: 1.5,
            borderColor: '#cbd5e1',
            backgroundColor: '#fff',
            paddingVertical: 15,
            alignItems: 'center',
          }}
          activeOpacity={0.7}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#64748b' }}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNext}
          style={{
            flex: 2,
            borderRadius: 30,
            backgroundColor: '#3b82f6',
            paddingVertical: 15,
            alignItems: 'center',
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 6,
          }}
          activeOpacity={0.85}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
            {stepNumber === totalSteps ? 'Got it!' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
