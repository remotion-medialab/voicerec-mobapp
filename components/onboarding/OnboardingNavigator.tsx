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
    step2: require('../../assets/icon.png'),
    step3: require('../../assets/step3.png'),
    step4: require('../../assets/step3.png')
  };

  // Complete onboarding flow starting with welcome screen
  const screens: OnboardingScreen[] = [
    'welcome',
    'participant-id',
    'personalized-welcome',
    'explanation-1',
    'explanation-2',
    'explanation-3',
    'explanation-4',
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
          onBeginTutorial={nextScreen}
          onSkip={() => onComplete(data)}
          progress={progress}
        />
      );

    case 'explanation-1':
      return (
        <ExplanationScreen
          stepNumber={1}
          totalSteps={4}
          icon="🎯"
          title={'Set your health goal.'}
          subtitle="Tell us what you're working toward, like losing weight or having more energy."
          imagePath={stepImages.step1}
          imageSize={{ width: 200, height: 200 }}
          imageBorderRadius={20}
          onNext={nextScreen}
          onBack={previousScreen}
          progress={progress}
        />
      );

    case 'explanation-2':
      return (
        <ExplanationScreen
          stepNumber={2}
          totalSteps={4}
          icon="🍽️"
          title={'Get meal ideas tailored to your health goal.'}
          subtitle="Tell us what you have at home or where you're eating out — we'll suggest the best options."
          imagePath={stepImages.step2}
          imageSize={{ width: 200, height: 200 }}
          onNext={nextScreen}
          onBack={previousScreen}
          progress={progress}
        />
      );
      
    case 'explanation-3':
      return (
        <ExplanationScreen
          stepNumber={3}
          totalSteps={4}
          icon="📸"
          title={'Log what you ate — we estimate the calories for you.'}
          subtitle="Take a photo of your plate and we'll break down the nutrition instantly."
          imagePath={stepImages.step3}
          imageSize={{ width: 205, height: 205 }}
          onNext={nextScreen}
          onBack={previousScreen}
          progress={progress}
        />
      );

    case 'explanation-4':
      return (
        <ExplanationScreen
          stepNumber={4}
          totalSteps={4}
          icon="🎙️"
          title={'Reflect on how your meal made you feel.'}
          subtitle="A quick voice note after eating helps you build awareness around food and energy."
          imagePath={stepImages.step3}
          imageSize={{ width: 205, height: 205 }}
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
