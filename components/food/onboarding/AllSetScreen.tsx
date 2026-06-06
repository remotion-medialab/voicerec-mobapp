import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  onStart: () => void;
}

export function AllSetScreen({ onStart }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [scale, fade]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Animated.View style={[styles.emojiWrapper, { transform: [{ scale }] }]}>
          <Text style={styles.emoji}>🎉</Text>
        </Animated.View>

        <Animated.View style={{ opacity: fade }}>
          <Text style={styles.title}>You're all set!</Text>
          <Text style={styles.subtitle}>
            Your food companion is ready. Start logging meals and discover how your body feels
            after each one.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fade }]}>
          <TouchableOpacity style={styles.btn} onPress={onStart} activeOpacity={0.85}>
            <Text style={styles.btnText}>Start journaling</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' },
  emojiWrapper: { marginBottom: 24 },
  emoji: { fontSize: 80 },
  title: { fontSize: 32, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 16 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, marginBottom: 48 },
  footer: { width: '100%' },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
});
