import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { OnboardingNavigator } from './components/onboarding/OnboardingNavigator';
import { RecordingApp } from './components/recording/RecordingApp';
import { OnboardingData } from './types/onboarding';

import './global.css';

export default function App() {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [userData, setUserData] = useState<OnboardingData | null>(null);

  const handleOnboardingComplete = (data: OnboardingData) => {
    setUserData(data);
    setOnboardingComplete(true);
  };

  if (!onboardingComplete) {
    return (
      <>
        <OnboardingNavigator onComplete={handleOnboardingComplete} />
        <StatusBar style="dark" />
      </>
    );
  }

  // Main recording app after onboarding
  return (
    <>
      <RecordingApp />
      <StatusBar style="dark" />
    </>
  );
}
