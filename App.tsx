import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FoodOnboardingNavigator } from './components/food/onboarding/FoodOnboardingNavigator';
import { FoodAppNavigator } from './components/FoodAppNavigator';
import { getFoodProfile } from './services/food';

import './global.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // When user signs in, check if they've completed food onboarding
  useEffect(() => {
    if (!user) {
      setOnboardingComplete(false);
      return;
    }
    setProfileLoading(true);
    getFoodProfile(user.uid)
      .then((profile) => {
        setOnboardingComplete(profile?.onboardingComplete ?? false);
      })
      .catch(() => setOnboardingComplete(false))
      .finally(() => setProfileLoading(false));
  }, [user]);

  if (loading || profileLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#6366f1" />
        <Text className="mt-4 text-slate-400">Loading…</Text>
      </View>
    );
  }

  // Not signed in OR signed in but onboarding not complete → show food onboarding
  if (!user || !onboardingComplete) {
    return (
      <>
        <FoodOnboardingNavigator onComplete={() => setOnboardingComplete(true)} />
        <StatusBar style="dark" />
      </>
    );
  }

  return (
    <>
      <FoodAppNavigator />
      <StatusBar style="dark" />
    </>
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
