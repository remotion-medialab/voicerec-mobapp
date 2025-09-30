import React, { useState } from 'react';
import { HomeScreen } from './HomeScreen';
import { RecordingApp } from './recording/RecordingApp';
import { RecordingsListScreen } from './RecordingsListScreen';
import { RecordingPlayerScreen } from './RecordingPlayerScreen';
import { RecordingEntry } from '../types/recording';
import { GoalsScreen } from './GoalsScreen';

type Screen = 'home' | 'journal' | 'recordings' | 'player' | 'goals';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedRecording, setSelectedRecording] = useState<RecordingEntry | null>(null);

  const navigateToGoals = () => {
    setCurrentScreen('goals');
  };

  const navigateToHome = () => {
    setCurrentScreen('home');
    setSelectedRecording(null);
  };

  const navigateToJournal = () => {
    setCurrentScreen('journal');
  };

  const navigateToRecordings = () => {
    // Open the dedicated Voice Recordings screen
    setCurrentScreen('recordings');
  };

  const navigateToPlayer = (recording: RecordingEntry) => {
    setSelectedRecording(recording);
    setCurrentScreen('player');
  };

  const handleRecordingComplete = () => {
    // Return to main menu/home
    navigateToHome();
  };

  switch (currentScreen) {
    case 'home':
      return (
        <HomeScreen
          onJournal={navigateToJournal}
          onViewRecordings={navigateToRecordings}
          onGoals={navigateToGoals}
        />
      );

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
          onGoals={navigateToGoals}
        />
      );
    case 'goals':
      return <GoalsScreen onBack={navigateToHome} />;
    default:
      return (
        <HomeScreen
          onJournal={navigateToJournal}
          onViewRecordings={navigateToRecordings}
          onGoals={navigateToGoals}
        />
      );
  }
};
