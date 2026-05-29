import React, { useState } from 'react';
import { HomeScreen } from './HomeScreen';
import { RecordingApp } from './recording/RecordingApp';
import { RecordingsListScreen } from './RecordingsListScreen';
import { RecordingPlayerScreen } from './RecordingPlayerScreen';
import { RingInterfaceScreen } from './RingInterfaceScreen';
import { RecordingEntry } from '../types/recording';

type Screen = 'home' | 'journal' | 'recordings' | 'player' | 'ring';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedRecording, setSelectedRecording] = useState<RecordingEntry | null>(null);

  const navigateToHome = () => {
    setCurrentScreen('home');
    setSelectedRecording(null);
  };

  const navigateToJournal = () => {
    setCurrentScreen('journal');
  };

  const navigateToRecordings = () => {
    setCurrentScreen('recordings');
  };

  const navigateToRingInterface = () => {
    setCurrentScreen('ring');
  };

  const navigateToPlayer = (recording: RecordingEntry) => {
    setSelectedRecording(recording);
    setCurrentScreen('player');
  };

  const handleRecordingComplete = () => {
    navigateToHome();
  };

  switch (currentScreen) {
    case 'home':
      return (
        <HomeScreen
          onJournal={navigateToJournal}
          onViewRecordings={navigateToRecordings}
          onRingInterface={navigateToRingInterface}
        />
      );

    case 'ring':
      return <RingInterfaceScreen onBack={navigateToHome} />;

    case 'journal':
      return <RecordingApp onComplete={handleRecordingComplete} />;

    case 'recordings':
      return <RecordingsListScreen onBack={navigateToHome} onPlayRecording={navigateToPlayer} />;

    case 'player':
      return selectedRecording ? (
        <RecordingPlayerScreen currentRecording={selectedRecording} onBack={navigateToRecordings} />
      ) : (
        <HomeScreen
          onJournal={navigateToJournal}
          onViewRecordings={navigateToRecordings}
          onRingInterface={navigateToRingInterface}
        />
      );

    default:
      return (
        <HomeScreen
          onJournal={navigateToJournal}
          onViewRecordings={navigateToRecordings}
          onRingInterface={navigateToRingInterface}
        />
      );
  }
};
