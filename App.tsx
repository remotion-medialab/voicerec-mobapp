import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignupScreen } from './components/auth/SignupScreen';
import { OnboardingNavigator } from './components/onboarding/OnboardingNavigator';
import { RecordingApp } from './components/recording/RecordingApp';
import { OnboardingData } from './types/onboarding';

import './global.css';

function AppContent() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [userData, setUserData] = useState<OnboardingData | null>(null);

  const handleOnboardingComplete = (data: OnboardingData) => {
    setUserData(data);
    setOnboardingComplete(true);
  };

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View className="flex-1 bg-gray-900 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Show auth screens if not logged in
  if (!user) {
    if (showLogin) {
      return (
        <>
          <LoginScreen onSwitchToSignup={() => setShowLogin(false)} />
          <StatusBar style="light" />
        </>
      );
    } else {
      return (
        <>
          <SignupScreen onSwitchToLogin={() => setShowLogin(true)} />
          <StatusBar style="light" />
        </>
      );
    }
  }

  // Show onboarding for new users (simplified - in production, check if user has completed onboarding)
  if (!onboardingComplete) {
    return (
      <>
        <OnboardingNavigator onComplete={handleOnboardingComplete} />
        <StatusBar style="dark" />
      </>
    );
  }

  // Main recording app after authentication and onboarding
  return (
    <>
      <RecordingApp />
      <StatusBar style="dark" />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
