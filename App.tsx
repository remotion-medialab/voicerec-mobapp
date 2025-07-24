import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OnboardingNavigator } from './components/onboarding/OnboardingNavigator';
import { AppNavigator } from './components/AppNavigator';
import { OnboardingData } from './types/onboarding';
import { signInOrSignUp } from './services/auth';

import './global.css';

function AppContent() {
  const { user, loading, error } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    try {
      console.log('🚀 Onboarding completed! Starting authentication with email:', data.email);
      setIsAuthenticating(true);
      setAuthError(null);

      // Authenticate the user with their email and password after completing ALL onboarding steps
      const user = await signInOrSignUp(data.email, data.password, data.name);

      console.log('✅ Authentication successful, proceeding to main app');
      console.log('🔑 User UID:', user.uid);
      console.log('📧 User email:', user.email);
      console.log('🕒 Auth time:', new Date().toISOString());

      setOnboardingComplete(true);
    } catch (error: any) {
      console.error('❌ Failed to authenticate user:', error);

      // Set a user-friendly error message
      let errorMessage = 'Authentication failed. Please try again.';
      if (error.code === 'auth/weak-password') {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered with a different password.';
      }

      setAuthError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-blue-500">Setting up your session...</Text>
      </View>
    );
  }

  // Show authentication loading screen
  if (isAuthenticating) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-blue-500">Preparing your experience...</Text>
      </View>
    );
  }

  // Don't block on connection errors - continue with the app
  if (error) {
    console.warn('Connection error:', error);
  }

  // Show authentication error screen with retry option
  if (authError) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <View className="items-center">
          <Text className="mb-4 text-center text-lg font-medium text-red-600">
            Authentication Error
          </Text>
          <Text className="mb-8 text-center text-gray-600">{authError}</Text>
          <TouchableOpacity
            onPress={() => {
              setAuthError(null);
              setOnboardingComplete(false);
            }}
            className="rounded-full bg-blue-500 px-8 py-3"
            activeOpacity={0.8}>
            <Text className="text-center text-lg font-medium text-white">Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show onboarding if user is not authenticated (complete flow: email → welcome → 3 steps → permission → auth)
  if (!user) {
    return (
      <>
        <OnboardingNavigator onComplete={handleOnboardingComplete} />
        <StatusBar style="dark" />
      </>
    );
  }

  // Main app after authentication
  return (
    <>
      <AppNavigator />
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
