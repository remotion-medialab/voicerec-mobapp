import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  GoalCreationState,
  GoalCreationContextType,
  GoalData,
  GoalCreationScreen,
} from '../types/goals';
import { GoalService } from '../services/goals';

const initialState: GoalCreationState = {
  currentScreen: 'time-of-day',
  data: {},
  progress: 0,
};

const GoalCreationContext = createContext<GoalCreationContextType>({
  state: initialState,
  updateData: () => {},
  nextScreen: () => {},
  previousScreen: () => {},
  saveGoal: async () => {},
  resetFlow: () => {},
});

export const useGoalCreation = () => {
  const context = useContext(GoalCreationContext);
  if (!context) {
    throw new Error('useGoalCreation must be used within a GoalCreationProvider');
  }
  return context;
};

interface GoalCreationProviderProps {
  children: ReactNode;
  initialGoal?: string; // The goal text passed from the previous screen
}

export const GoalCreationProvider: React.FC<GoalCreationProviderProps> = ({
  children,
  initialGoal,
}) => {
  const [state, setState] = useState<GoalCreationState>({
    ...initialState,
    data: { goal: initialGoal || '' },
    progress: (1 / 4) * 100, // Init at 25 since we already have goal
  });

  const screens: GoalCreationScreen[] = ['time-of-day', 'intensity-frequency', 'locations'];

  const updateData = (updates: Partial<GoalData>) => {
    setState((prev) => ({
      ...prev,
      data: { ...prev.data, ...updates },
    }));
  };

  const nextScreen = () => {
    const currentIndex = screens.indexOf(state.currentScreen);
    if (currentIndex < screens.length - 1) {
      const nextScreenValue = screens[currentIndex + 1];
      setState((prev) => ({
        ...prev,
        currentScreen: nextScreenValue,
        progress: ((currentIndex + 2) / (screens.length + 1)) * 100, // +1 to account for initial goal screen
      }));
    }
  };

  const previousScreen = () => {
    const currentIndex = screens.indexOf(state.currentScreen);
    if (currentIndex > 0) {
      const prevScreenValue = screens[currentIndex - 1];
      setState((prev) => ({
        ...prev,
        currentScreen: prevScreenValue,
        progress: (currentIndex / (screens.length + 1)) * 100, // +1 to account for initial goal screen
      }));
    }
  };

  const saveGoal = async () => {
    try {
      if (!isGoalDataComplete(state.data)) {
        throw new Error('Goal data is incomplete');
      }

      await GoalService.createGoal(state.data as GoalData);
      console.log('Goal saved successfully');
    } catch (error) {
      console.error('Error saving goal:', error);
      throw error;
    }
  };

  const resetFlow = () => {
    setState({
      ...initialState,
      data: { goal: initialGoal || '' },
      progress: (1 / 4) * 100, // Init at 25 since we already have goal
    });
  };

  // Helper function to check if goal data is complete
  const isGoalDataComplete = (data: Partial<GoalData>): data is GoalData => {
    return !!(
      data.goal &&
      data.timeOfDay &&
      data.timeOfDay.length > 0 &&
      data.intensityFrequency &&
      data.locations
    );
  };

  const value: GoalCreationContextType = {
    state,
    updateData,
    nextScreen,
    previousScreen,
    saveGoal,
    resetFlow,
  };

  return <GoalCreationContext.Provider value={value}>{children}</GoalCreationContext.Provider>;
};
