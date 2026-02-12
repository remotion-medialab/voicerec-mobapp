/**
 * Session and Reflection Types
 * For multi-step recording sessions with goal tracking and reflection questions
 */

export interface ReflectionAnswers {
  q1: string; // What specific actions did you take today toward this goal?
  q2: string; // What challenges or obstacles did you face?
  q3: string; // How did you feel during and after working on this goal?
  q4: string; // What did you learn from today's experience?
  q5: string; // What will you do differently or continue doing tomorrow?
}

export interface ReflectionQuestion {
  id: keyof ReflectionAnswers;
  question: string;
  placeholder: string;
}

// Here are the placeholder counterfactual questions
export const REFLECTION_QUESTIONS: ReflectionQuestion[] = [
  {
    id: 'q1',
    question: 'Placeholder Question 1',
    placeholder: 'Write text here...',
  },
  {
    id: 'q2',
    question: 'Placeholder Question 2',
    placeholder: 'Write text here...',
  },
  {
    id: 'q3',
    question: 'Placeholder Question 3',
    placeholder: 'Write text here...',
  },
  {
    id: 'q4',
    question: 'Placeholder Question 4',
    placeholder: 'Write text here...',
  },
  {
    id: 'q5',
    question: 'Placeholder Question 5',
    placeholder: 'Write text here...',
  },
];

// Counterfactual workflow types
export interface CounterfactualRating {
  relevance: number;      // 1-5
  specificity: number;    // 1-5
  actionability: number;  // 1-5
  faithfulness: number;   // 1-5
}

export interface AICounterfactual {
  title: string;
  text: string;
  tags: string[];
  rating: CounterfactualRating | null;
}

export type CounterfactualStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface CounterfactualWorkflow {
  humanCounterfactual: string;
  aiCounterfactuals: AICounterfactual[];
  previousGenerations: AICounterfactual[][]; // archived prior generations
  favoriteIndex: number | null;
  editedFavorite: string | null;
  overallPreference: 'human' | 'ai' | null;
  currentStep: CounterfactualStep;
  generatedAt: Date | any | null;
  completedAt: Date | any | null;
}

export interface RatingQuality {
  key: keyof CounterfactualRating;
  label: string;
  description: string;
}

export const RATING_QUALITIES: RatingQuality[] = [
  { key: 'relevance', label: 'Relevance', description: 'How relevant to the situation' },
  { key: 'specificity', label: 'Specificity', description: 'How specific and concrete' },
  { key: 'actionability', label: 'Actionability', description: 'How actionable' },
  { key: 'faithfulness', label: 'Faithfulness', description: 'How faithful to the journal context' },
];

/**
 * Session data as stored in Firestore
 * Path: users/{userId}/sessions/session{sessionNumber}
 */
export interface SessionData {
  userId: string;
  sessionNumber: number;
  goalId: string | null; // null = Miscellaneous
  isComplete: boolean;
  createdAt: Date | any; // Firestore Timestamp or Date
  completedAt?: Date | any; // When all 5 steps were completed

  // NEW fields for the detailed recording page
  transcript?: string; // Combined transcript of all 5 recordings
  transcriptionStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  reflectionAnswers?: Partial<ReflectionAnswers>; // User's answers to reflection questions
  answersCompletedAt?: Date | any; // When user clicked "Done" on reflection questions

  // Counterfactual workflow
  counterfactuals?: string[]; // Legacy field for backward compat
  counterfactualWorkflow?: CounterfactualWorkflow;
  reflectionStatus?: number; // 0=not started, 1=in progress, 2=complete
}

/**
 * Session with additional UI data
 * Used in components for display
 */
export interface SessionWithMeta extends SessionData {
  displayTitle: string; // e.g., "Sep 29th 8:45pm"
  goalName: string; // e.g., "Exercise 3x per week" or "Miscellaneous"
  recordingCount: number; // Number of recordings in this session
}
