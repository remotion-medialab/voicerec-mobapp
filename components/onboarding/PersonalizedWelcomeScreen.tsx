import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PersonalizedWelcomeScreenProps {
  name: string;
  onBeginTutorial: () => void;
  onSkip: () => void;
  progress: number;
}

export const PersonalizedWelcomeScreen: React.FC<PersonalizedWelcomeScreenProps> = ({
  onBeginTutorial,
  onSkip,
  progress,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const chips: { icon: keyof typeof Ionicons.glyphMap; label: string; bgColor: string; iconColor: string }[] = [
    { icon: 'trophy-outline', label: 'Goal-based meal planning', bgColor: '#dbeafe', iconColor: '#3b82f6' },
    { icon: 'camera-outline', label: 'Meal logging', bgColor: '#d1fae5', iconColor: '#10b981' },
    { icon: 'mic-outline', label: 'Voice reflection', bgColor: '#fef3c7', iconColor: '#f59e0b' },
  ];

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
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
          {/* Celebration emoji */}
          <Text style={{ fontSize: 56, marginBottom: 24, textAlign: 'center' }}>🎉</Text>

          {/* Title */}
          <Text
            style={{
              fontSize: 32,
              fontWeight: '300',
              color: '#1e293b',
              textAlign: 'center',
              lineHeight: 42,
              marginBottom: 14,
            }}>
            You're all set!
          </Text>

          <Text
            style={{
              fontSize: 16,
              color: '#64748b',
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 40,
            }}>
            Here's what RE:SELF helps you do every day:
          </Text>

          {/* Feature chips */}
          <View style={{ gap: 12 }}>
            {chips.map(({ icon, label, bgColor, iconColor }) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 18,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 2,
                }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: bgColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}>
                  <Ionicons name={icon} size={20} color={iconColor} />
                </View>
                <Text style={{ fontSize: 16, color: '#334155', fontWeight: '500' }}>{label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Buttons */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 44, gap: 12 }}>
        <TouchableOpacity
          onPress={onBeginTutorial}
          style={{
            borderRadius: 30,
            backgroundColor: '#3b82f6',
            paddingVertical: 16,
            alignItems: 'center',
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 6,
          }}
          activeOpacity={0.85}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Show me how it works</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: 15, color: '#94a3b8', fontWeight: '500' }}>Skip tutorial</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
