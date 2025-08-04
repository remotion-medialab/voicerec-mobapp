import React, { useState } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { LoginScreen } from './ParticipantIdScreen';
import { PersonalizedWelcomeScreen } from './PersonalizedWelcomeScreen';
import { ExplanationScreen } from './ExplanationScreen';
import { PermissionScreen } from './PermissionScreen';
import { OnboardingScreen, OnboardingData } from '../../types/onboarding';

interface OnboardingNavigatorProps {
  onComplete: (data: OnboardingData) => void;
}

export const OnboardingNavigator: React.FC<OnboardingNavigatorProps> = ({ onComplete }) => {
  const [currentScreen, setCurrentScreen] = useState<OnboardingScreen>('welcome');
  const [data, setData] = useState<OnboardingData>({
    name: '',
    email: '',
    password: '',
  });

  // Define image paths inside component to avoid TypeScript analysis issues
  const stepImages = {
    step1: require('../../assets/step1.png'),
    step2: require('../../assets/step2.png'),
    step3: require('../../assets/step3.png'),
  };

  // Complete onboarding flow starting with welcome screen
  const screens: OnboardingScreen[] = [
    'welcome',
    'participant-id',
    'personalized-welcome',
    'explanation-1',
    'explanation-2',
    'explanation-3',
    'permission-request',
  ];

  const currentIndex = screens.indexOf(currentScreen);
  const progress = ((currentIndex + 1) / screens.length) * 100;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextScreen = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < screens.length) {
      setCurrentScreen(screens[nextIndex]);
    } else {
      onComplete(data);
    }
  };

  const previousScreen = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentScreen(screens[prevIndex]);
    }
  };

  const handleLoginNext = (email: string, password: string) => {
    updateData({ email, password });
    nextScreen();
  };

  const handlePermissionAllow = () => {
    // In a real app, you would request actual microphone permission here
    onComplete(data);
  };

  const handlePermissionDeny = () => {
    // Handle permission denial - for now just complete
    onComplete(data);
  };

  switch (currentScreen) {
    case 'welcome':
      return <WelcomeScreen onGetStarted={nextScreen} />;

    case 'participant-id':
      return <LoginScreen onNext={handleLoginNext} onBack={previousScreen} progress={progress} />;

    case 'personalized-welcome':
      return (
        <PersonalizedWelcomeScreen
          name=""
          onNext={nextScreen}
          onBack={previousScreen}
          progress={progress}
        />
      );

    case 'explanation-1':
      return (
        <ExplanationScreen
          stepNumber={1}
          title="Capture moments that linger in your mind."
          imagePath={stepImages.step1}
          onNext={nextScreen}
          onBack={previousScreen}
          progress={progress}
        />
      );

    case 'explanation-2':
      return (
        <ExplanationScreen
          stepNumber={2}
          title="Speak your thoughts - no need to type."
          imagePath={stepImages.step2}
          onNext={nextScreen}
          onBack={previousScreen}
          progress={progress}
        />
      );

    case 'explanation-3':
      return (
        <ExplanationScreen
          stepNumber={3}
          title="Reflect on your day later with clarity."
          imagePath={stepImages.step3}
          onNext={nextScreen}
          onBack={previousScreen}
          progress={progress}
        />
      );

    case 'permission-request':
      return <PermissionScreen onAllow={handlePermissionAllow} onDeny={handlePermissionDeny} />;

    default:
      return <WelcomeScreen onGetStarted={nextScreen} />;
  }
};
