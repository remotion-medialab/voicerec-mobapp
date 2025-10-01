import React, { useState } from 'react';
import { HomeScreen } from './HomeScreen';
import { RecordingApp } from './recording/RecordingApp';
import { RecordingsListScreen } from './RecordingsListScreen';
import { RecordingPlayerScreen } from './RecordingPlayerScreen';
import { RecordingEntry } from '../types/recording';
import { GoalsScreen } from './GoalsScreen';
import { SetNewGoalScreen } from './goals/SetNewGoalScreen';
import { GoalCreationNavigator } from './goals/GoalCreationNavigator';
import { GoalCreationProvider } from '../contexts/GoalCreationContext';

type Screen =
  | 'home'
  | 'journal'
  | 'recordings'
  | 'player'
  | 'goals'
  | 'set-new-goal'
  | 'goal-creation';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedRecording, setSelectedRecording] = useState<RecordingEntry | null>(null);
  const [goalText, setGoalText] = useState<string>('');

  const navigateToGoals = () => {
    setCurrentScreen('goals');
  };

  const navigateToSetNewGoal = () => {
    setCurrentScreen('set-new-goal');
  };

  const navigateToGoalCreation = (goal: string) => {
    setGoalText(goal);
    setCurrentScreen('goal-creation');
  };

  const navigateToHome = () => {
    setCurrentScreen('home');
    setSelectedRecording(null);
    setGoalText('');
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
      return <GoalsScreen onBack={navigateToHome} onSetNewGoal={navigateToSetNewGoal} />;

    case 'set-new-goal':
      return <SetNewGoalScreen onNext={navigateToGoalCreation} onBack={navigateToGoals} />;

    case 'goal-creation':
      return (
        <GoalCreationProvider initialGoal={goalText}>
          <GoalCreationNavigator onComplete={navigateToGoals} onBack={navigateToSetNewGoal} />
        </GoalCreationProvider>
      );

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
