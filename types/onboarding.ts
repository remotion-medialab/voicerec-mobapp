export interface OnboardingData {
  name: string;
  email: string;
  password: string;
}

export type OnboardingScreen =
  | 'welcome'
  | 'name-input'
  | 'participant-id'
  | 'personalized-welcome'
  | 'explanation-1'
  | 'explanation-2'
  | 'explanation-3'
  | 'explanation-4'
  | 'permission-request';

export interface OnboardingContextType {
  currentScreen: OnboardingScreen;
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  nextScreen: () => void;
  previousScreen: () => void;
  progress: number;
}
