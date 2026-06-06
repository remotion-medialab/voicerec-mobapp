import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WelcomeAuthScreen } from './components/onboarding/WelcomeAuthScreen';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { RootNavigator } from './components/RootNavigator';
import { hasCompletedOnboarding } from './services/profile';
import { colors } from './components/ui';

import './global.css';

function AppContent() {
  const { user, loading } = useAuth();
  // null = not yet checked for the current user
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setOnboarded(null);
      return;
    }
    let active = true;
    hasCompletedOnboarding().then((done) => {
      if (active) setOnboarded(done);
    });
    return () => {
      active = false;
    };
  }, [user]);

  if (loading) return <Splash label="Setting up your kitchen…" />;

  // Phase A entry — not signed in.
  if (!user) {
    return (
      <>
        <WelcomeAuthScreen />
        <StatusBar style="light" />
      </>
    );
  }

  // Waiting on the onboarding-status read.
  if (onboarded === null) return <Splash label="Loading your profile…" />;

  // One-time profile setup.
  if (!onboarded) {
    return (
      <>
        <OnboardingFlow onComplete={() => setOnboarded(true)} />
        <StatusBar style="dark" />
      </>
    );
  }

  // Main app.
  return (
    <>
      <RootNavigator />
      <StatusBar style="dark" />
    </>
  );
}

function Splash({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className="mt-4" style={{ color: colors.subtle }}>
        {label}
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
