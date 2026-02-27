import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StatusBar, Image } from 'react-native';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onGetStarted }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;
  const blob3Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating blob animations
    const floatBlob = (anim: Animated.Value, duration: number, offset: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration, delay: offset, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
        ])
      ).start();

    floatBlob(blob1Y, 3200, 0);
    floatBlob(blob2Y, 4000, 800);
    floatBlob(blob3Y, 3600, 400);
  }, [fadeAnim, scaleAnim, blob1Y, blob2Y, blob3Y]);

  const b1 = blob1Y.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const b2 = blob2Y.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
  const b3 = blob3Y.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f9ff' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Decorative blobs */}
      <Animated.View
        style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: '#bfdbfe',
          opacity: 0.45,
          transform: [{ translateY: b1 }],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          top: 100,
          left: -70,
          width: 170,
          height: 170,
          borderRadius: 85,
          backgroundColor: '#bbf7d0',
          opacity: 0.4,
          transform: [{ translateY: b2 }],
        }}
      />
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 160,
          right: -35,
          width: 130,
          height: 130,
          borderRadius: 65,
          backgroundColor: '#fde68a',
          opacity: 0.45,
          transform: [{ translateY: b3 }],
        }}
      />

      {/* Main content */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Animated.View
          style={{
            alignItems: 'center',
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}>
          {/* Hero image */}
          <View
            style={{
              marginBottom: 36,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 8,
            }}>
            <Image
              source={require('../../assets/icon.png')}
              style={{ width: 220, height: 220, borderRadius: 48 }}
              resizeMode="cover"
            />
          </View>

          {/* Brand name */}
          <Text
            style={{
              fontSize: 46,
              fontWeight: '200',
              letterSpacing: 10,
              color: '#3b82f6',
              marginBottom: 10,
            }}>
            RE:SELF
          </Text>

          {/* Tagline */}
          <Text
            style={{
              fontSize: 16,
              color: '#64748b',
              textAlign: 'center',
              letterSpacing: 0.5,
              marginBottom: 20,
            }}>
            Eat well. Reach your goals.
          </Text>

          {/* Colored dot divider */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['#3b82f6', '#34d399', '#fbbf24'].map((color, i) => (
              <View
                key={i}
                style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }}
              />
            ))}
          </View>
        </Animated.View>
      </View>

      {/* Bottom CTA */}
      <Animated.View
        style={{ paddingHorizontal: 32, paddingBottom: 52, opacity: fadeAnim }}>
        <TouchableOpacity
          onPress={onGetStarted}
          style={{
            borderRadius: 30,
            backgroundColor: '#3b82f6',
            paddingVertical: 18,
            alignItems: 'center',
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 18,
            elevation: 10,
          }}
          activeOpacity={0.85}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#fff', letterSpacing: 0.5 }}>
            Get Started
          </Text>
        </TouchableOpacity>

        <Text
          style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 14 }}>
          Your personalized food journey awaits
        </Text>
      </Animated.View>
    </View>
  );
};
