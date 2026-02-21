import React, { useState } from 'react';
import { HomeScreen } from './HomeScreen';
import { RecordingApp } from './recording/RecordingApp';
import { GoalSelectionScreen } from './recording/GoalSelectionScreen';
import { JournalModeSelectionScreen } from './recording/JournalModeSelectionScreen';
import { WritingJournalScreen } from './recording/WritingJournalScreen';
import { RecordingsListScreen } from './RecordingsListScreen';
import { RecordingPlayerScreen } from './RecordingPlayerScreen';
import { RecordingDetailScreen } from './RecordingDetailScreen';
import { RecordingEntry } from '../types/recording';
import { GoalsScreen } from './GoalsScreen';
import { SetNewGoalScreen } from './goals/SetNewGoalScreen';
import { GoalCreationNavigator } from './goals/GoalCreationNavigator';
import { GoalCreationProvider } from '../contexts/GoalCreationContext';
import { GoalsDashboard } from './GoalsDashboard';

type Screen =
  | 'home'
  | 'goal-selection'
  | 'journal-mode-selection'
  | 'journal'
  | 'writing-journal'
  | 'recordings'
  | 'recording-detail'
  | 'player'
  | 'goals'
  | 'set-new-goal'
  | 'goal-creation'
  | 'goals-dashboard';

export const AppNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedRecording, setSelectedRecording] = useState<RecordingEntry | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedSessionNumber, setSelectedSessionNumber] = useState<number | null>(null);
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

  const navigateToGoalsDashboard = () => {
    setCurrentScreen('goals-dashboard');
  };

  const navigateToHome = () => {
    setCurrentScreen('home');
    setSelectedRecording(null);
    setSelectedGoalId(null);
    setGoalText('');
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

  const navigateToRecordingDetail = (sessionNumber: number) => {
    setSelectedSessionNumber(sessionNumber);
    setCurrentScreen('recording-detail');
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
        <RecordingsListScreen
          onBack={navigateToHome}
          onViewSessionDetail={navigateToRecordingDetail}
        />
      );

    case 'recording-detail':
      return selectedSessionNumber ? (
        <RecordingDetailScreen
          sessionNumber={selectedSessionNumber}
          onBack={navigateToRecordings}
          onComplete={navigateToRecordings}
        />
      ) : (
        <HomeScreen
          onJournal={navigateToGoalSelection}
          onViewRecordings={navigateToRecordings}
          onGoals={navigateToGoals}
        />
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
      return (
        <GoalsScreen
          onBack={navigateToHome}
          onSetNewGoal={navigateToSetNewGoal}
          onGoToDashboard={navigateToGoalsDashboard}
        />
      );

    case 'goals-dashboard':
      return <GoalsDashboard onBack={navigateToGoals} />;

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
          onJournal={navigateToGoalSelection}
          onViewRecordings={navigateToRecordings}
          onGoals={navigateToGoals}
        />
      );
  }
};
