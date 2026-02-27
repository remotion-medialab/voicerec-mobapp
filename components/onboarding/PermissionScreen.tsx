import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PermissionScreenProps {
  onAllow: () => void;
  onDeny: () => void;
}

export const PermissionScreen: React.FC<PermissionScreenProps> = ({ onAllow, onDeny }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const permissions: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    label: string;
    description: string;
    bgColor: string;
    borderColor: string;
  }[] = [
    {
      icon: 'camera-outline',
      iconColor: '#3b82f6',
      label: 'Camera',
      description: 'Snap photos of your meals for calorie estimates.',
      bgColor: '#dbeafe',
      borderColor: '#93c5fd',
    },
    {
      icon: 'mic-outline',
      iconColor: '#10b981',
      label: 'Microphone',
      description: 'Record short voice reflections after eating.',
      bgColor: '#d1fae5',
      borderColor: '#6ee7b7',
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: '#fef3c7',
                borderWidth: 1.5,
                borderColor: '#fcd34d',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="lock-closed-outline" size={34} color="#f59e0b" />
            </View>
          </View>

          {/* Title */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: '300',
              color: '#1e293b',
              textAlign: 'center',
              lineHeight: 38,
              marginBottom: 10,
            }}>
            We need a couple{'\n'}of permissions.
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: '#64748b',
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 36,
            }}>
            To give you the full RE:SELF experience, we'll need access to:
          </Text>

          {/* Permission cards */}
          <View style={{ gap: 14, marginBottom: 40 }}>
            {permissions.map(({ icon, iconColor, label, description, bgColor, borderColor }) => (
              <View
                key={label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: '#e2e8f0',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: bgColor,
                    borderWidth: 1.5,
                    borderColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 14,
                  }}>
                  <Ionicons name={icon} size={22} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 2 }}>
                    {label}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748b', lineHeight: 18 }}>{description}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Privacy note */}
          <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 }}>
            Your data is stored securely and never sold to third parties.
          </Text>
        </Animated.View>
      </View>

      {/* Buttons */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 44, gap: 12 }}>
        <TouchableOpacity
          onPress={onAllow}
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
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>Allow Access</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDeny} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={{ fontSize: 15, color: '#94a3b8', fontWeight: '500' }}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
