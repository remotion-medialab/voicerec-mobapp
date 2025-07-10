import React, { useState } from 'react';
import { WelcomeScreen } from './WelcomeScreen';
import { NameInputScreen } from './NameInputScreen';
import { ParticipantIdScreen } from './ParticipantIdScreen';
import { PersonalizedWelcomeScreen } from './PersonalizedWelcomeScreen';
import { ExplanationScreen } from './ExplanationScreen';
import { PermissionScreen } from './PermissionScreen';
import { BrainIcon, SpeechIcon, ReflectIcon } from './Icons';
import { OnboardingScreen, OnboardingData } from '../../types/onboarding';

interface OnboardingNavigatorProps {
  onComplete: (data: OnboardingData) => void;
}

export const OnboardingNavigator: React.FC<OnboardingNavigatorProps> = ({ onComplete }) => {
  const [currentScreen, setCurrentScreen] = useState<OnboardingScreen>('welcome');
  const [data, setData] = useState<OnboardingData>({
    name: '',
    participantId: '',
  });

  const screens: OnboardingScreen[] = [
    'welcome',
    'name-input',
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

  const handleNameNext = (name: string) => {
    updateData({ name });
    nextScreen();
  };

  const handleParticipantIdNext = (participantId: string) => {
    updateData({ participantId });
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

    case 'name-input':
      return (
        <NameInputScreen onNext={handleNameNext} onBack={previousScreen} progress={progress} />
      );

    case 'participant-id':
      return (
        <ParticipantIdScreen
          onNext={handleParticipantIdNext}
          onBack={previousScreen}
          progress={progress}
        />
      );

    case 'personalized-welcome':
      return (
        <PersonalizedWelcomeScreen
          name={data.name}
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
          icon={<BrainIcon />}
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
          icon={<SpeechIcon />}
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
          icon={<ReflectIcon />}
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
