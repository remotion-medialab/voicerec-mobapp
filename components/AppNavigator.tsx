import React, { useState } from 'react';
import { HomeScreen } from './HomeScreen';
import { RecordingApp } from './recording/RecordingApp';
import { GoalSelectionScreen } from './recording/GoalSelectionScreen';
import { JournalModeSelectionScreen } from './recording/JournalModeSelectionScreen';
import { WritingJournalScreen } from './recording/WritingJournalScreen';
import { RecordingsListScreen } from './RecordingsListScreen';
import { RecordingPlayerScreen } from './RecordingPlayerScreen';
import { RecordingEntry } from '../types/recording';
import { GoalsScreen } from './GoalsScreen';
import { SetNewGoalScreen } from './goals/SetNewGoalScreen';

type Screen =
  | 'home'
  | 'goal-selection'
  | 'journal-mode-selection'
  | 'journal'
  | 'writing-journal'
  | 'recordings'
  | 'player'
  | 'goals'
  | 'set-new-goal';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedRecording, setSelectedRecording] = useState<RecordingEntry | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const navigateToGoals = () => {
    setCurrentScreen('goals');
  };

  const navigateToSetNewGoal = () => {
    setCurrentScreen('set-new-goal');
  };

  const navigateToHome = () => {
    setCurrentScreen('home');
    setSelectedRecording(null);
    setSelectedGoalId(null);
  };

  const navigateToGoalSelection = () => {
    setCurrentScreen('goal-selection');
  };

  const navigateToJournalModeSelection = (goalId: string | null = null) => {
    setSelectedGoalId(goalId);
    setCurrentScreen('journal-mode-selection');
  };

  const navigateToJournal = (goalId: string | null = null) => {
    setSelectedGoalId(goalId);
    setCurrentScreen('journal');
  };

  const navigateToWritingJournal = (goalId: string | null = null) => {
    setSelectedGoalId(goalId);
    setCurrentScreen('writing-journal');
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
          onJournal={navigateToGoalSelection}
          onViewRecordings={navigateToRecordings}
          onGoals={navigateToGoals}
        />
      );

    case 'goal-selection':
      return (
        <GoalSelectionScreen
          onBack={navigateToHome}
          onSelectGoal={(goalId) => navigateToJournalModeSelection(goalId)}
        />
      );

    case 'journal-mode-selection':
      return (
        <JournalModeSelectionScreen
          onBack={navigateToGoalSelection}
          onSelectRecord={() => navigateToJournal(selectedGoalId)}
          onSelectWrite={() => navigateToWritingJournal(selectedGoalId)}
        />
      );

    case 'journal':
      return <RecordingApp goalId={selectedGoalId} onComplete={handleRecordingComplete} />;

    case 'writing-journal':
      return <WritingJournalScreen goalId={selectedGoalId} onComplete={handleRecordingComplete} />;

    case 'recordings':
      return (
        <RecordingsListScreen onBack={navigateToHome} onPlayRecording={navigateToPlayer} />
      );

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
      return <GoalsScreen onBack={navigateToHome} onSetNewGoal={navigateToSetNewGoal} />;

    case 'set-new-goal':
      return <SetNewGoalScreen onComplete={navigateToGoals} onBack={navigateToGoals} />;

    default:
      return (
        <HomeScreen
          onJournal={navigateToGoalSelection}
          onViewRecordings={navigateToRecordings}
          onGoals={navigateToGoals}
        />
      );
  }
};
