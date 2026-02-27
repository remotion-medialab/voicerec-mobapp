import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';

interface LoginScreenProps {
  onNext: (email: string, password: string) => void;
  onBack: () => void;
  progress: number;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNext, onBack, progress }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleNext = () => {
    if (email.trim() && password.trim()) {
      onNext(email.trim(), password.trim());
    }
  };

  const isValid = email.trim().length > 0 && password.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
          paddingTop: 40,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}>
        {/* Icon */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: '#dbeafe',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}>
          <Text style={{ fontSize: 28 }}>🥗</Text>
        </View>

        {/* Title */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: '300',
            color: '#1e293b',
            lineHeight: 38,
            marginBottom: 6,
          }}>
          Let's get you{'\n'}set up.
        </Text>
        <Text style={{ fontSize: 15, color: '#64748b', marginBottom: 36 }}>
          Sign in using the logins given to you.
        </Text>

        {/* Inputs */}
        <View style={{ gap: 12 }}>
          <TextInput
            style={{
              height: 54,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: emailFocused ? '#3b82f6' : '#e2e8f0',
              backgroundColor: emailFocused ? '#fff' : '#f8fafc',
              paddingHorizontal: 16,
              fontSize: 16,
              color: '#1e293b',
            }}
            placeholder="Email address"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />

          <TextInput
            style={{
              height: 54,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: passwordFocused ? '#3b82f6' : '#e2e8f0',
              backgroundColor: passwordFocused ? '#fff' : '#f8fafc',
              paddingHorizontal: 16,
              fontSize: 16,
              color: '#1e293b',
            }}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleNext}
          />
        </View>

      </Animated.View>

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
          onPress={handleNext}
          style={{
            flex: 2,
            borderRadius: 30,
            backgroundColor: isValid ? '#3b82f6' : '#cbd5e1',
            paddingVertical: 15,
            alignItems: 'center',
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isValid ? 0.3 : 0,
            shadowRadius: 10,
            elevation: isValid ? 6 : 0,
          }}
          activeOpacity={0.85}
          disabled={!isValid}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: isValid ? '#fff' : '#94a3b8' }}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
