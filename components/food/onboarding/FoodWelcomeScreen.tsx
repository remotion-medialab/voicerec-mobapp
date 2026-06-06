import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function FoodWelcomeScreen({ onGetStarted, onLogin }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View style={styles.imageWrapper}>
          <Text style={styles.emoji}>🍜</Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.headline}>Decide{'\n'}what to eat.</Text>
          <Text style={styles.subhead}>
            Learn how{'\n'}
            <Text style={styles.accent}>your body{'\n'}responds.</Text>
          </Text>
        </View>

        <Text style={styles.description}>
          A personal food journal that understands your tastes and helps you eat with intention.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={onGetStarted} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Sign up</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onLogin} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>Log in</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flex: 1, paddingHorizontal: 32, paddingTop: 40, paddingBottom: 32 },
  imageWrapper: { alignItems: 'center', marginBottom: 32 },
  emoji: { fontSize: 72 },
  textBlock: { marginBottom: 20 },
  headline: { fontSize: 40, fontWeight: '700', color: '#ffffff', lineHeight: 48 },
  subhead: { fontSize: 40, fontWeight: '700', color: '#ffffff', lineHeight: 48 },
  accent: { color: '#6366f1' },
  description: { fontSize: 15, color: '#94a3b8', lineHeight: 22, marginBottom: 48 },
  primaryBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#94a3b8', fontSize: 17, fontWeight: '500' },
});
