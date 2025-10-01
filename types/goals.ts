export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening';

export type IntensityFrequency = 'Low (1x per week)' | 'Medium (3x per week)' | 'High (daily)';

export interface GoalData {
  goal: string;
  timeOfDay: TimeOfDay[];
  intensityFrequency: IntensityFrequency;
  locations: string;
}

export interface Goal extends GoalData {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type GoalCreationScreen = 'time-of-day' | 'intensity-frequency' | 'locations';

export interface GoalCreationState {
  currentScreen: GoalCreationScreen;
  data: Partial<GoalData>;
  progress: number;
}

export interface GoalCreationContextType {
  state: GoalCreationState;
  updateData: (updates: Partial<GoalData>) => void;
  nextScreen: () => void;
  previousScreen: () => void;
  saveGoal: () => Promise<void>;
  resetFlow: () => void;
}

// Question configurations for the reusable component
export interface QuestionConfig {
  title: string;
  type: 'multiple-choice' | 'text-input';
  options?: string[];
  multipleSelection?: boolean;
  placeholder?: string;
}

export const GOAL_QUESTIONS: Record<GoalCreationScreen, QuestionConfig> = {
  'time-of-day': {
    title: 'What time of day do you want to work on this goal?',
    type: 'multiple-choice',
    options: ['Morning', 'Afternoon', 'Evening'],
    multipleSelection: true,
  },
  'intensity-frequency': {
    title: 'How often do you want to work on this goal?',
    type: 'multiple-choice',
    options: ['Low (1x per week)', 'Medium (3x per week)', 'High (daily)'],
    multipleSelection: false,
  },
  locations: {
    title: 'Where do you want to approach this goal?',
    type: 'text-input',
    placeholder: "Enter locations where you'd like to work on this goal...",
  },
};
