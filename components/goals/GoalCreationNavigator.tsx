import React from 'react';
import { Alert } from 'react-native';
import { GoalQuestionScreen } from './GoalQuestionScreen';
import { useGoalCreation } from '../../contexts/GoalCreationContext';
import { GOAL_QUESTIONS, TimeOfDay, IntensityFrequency } from '../../types/goals';

interface GoalCreationNavigatorProps {
  onComplete: () => void;
  onBack: () => void;
}

export const GoalCreationNavigator: React.FC<GoalCreationNavigatorProps> = ({
  onComplete,
  onBack,
}) => {
  const { state, updateData, nextScreen, previousScreen, saveGoal } = useGoalCreation();

  const screens = Object.keys(GOAL_QUESTIONS) as Array<keyof typeof GOAL_QUESTIONS>;
  const currentIndex = screens.indexOf(state.currentScreen);
  const isLast = currentIndex === screens.length - 1;

  const handleNext = async () => {
    if (isLast) {
      try {
        await saveGoal();
        onComplete();
      } catch (error) {
        Alert.alert('Error', 'Failed to save goal. Please try again.', [{ text: 'OK' }]);
      }
    } else {
      nextScreen();
    }
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      onBack();
    } else {
      previousScreen();
    }
  };

  const handleUpdate = (value: any) => {
    switch (state.currentScreen) {
      case 'time-of-day':
        updateData({ timeOfDay: value as TimeOfDay[] });
        break;
      case 'intensity-frequency':
        updateData({ intensityFrequency: value as IntensityFrequency });
        break;
      case 'locations':
        updateData({ locations: value as string });
        break;
    }
  };

  const getCurrentValue = () => {
    switch (state.currentScreen) {
      case 'time-of-day':
        return state.data.timeOfDay;
      case 'intensity-frequency':
        return state.data.intensityFrequency;
      case 'locations':
        return state.data.locations;
      default:
        return undefined;
    }
  };

  const config = GOAL_QUESTIONS[state.currentScreen];

  return (
    <GoalQuestionScreen
      config={config}
      onNext={handleNext}
      onBack={handleBack}
      onUpdate={handleUpdate}
      currentValue={getCurrentValue()}
      progress={state.progress}
      isLast={isLast}
    />
  );
};
