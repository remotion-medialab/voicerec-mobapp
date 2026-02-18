/**
 * Session and Reflection Types
 * For multi-step recording sessions with goal tracking and reflection questions
 */

export interface ReflectionAnswers {
  q1: string; // What food did you eat?
  q2: string; // Why did you pick this food?
  q3: string; // How did you feel after eating?
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
    question: 'What food did you eat?',
    placeholder: 'Write text here...',
  },
  {
    id: 'q2',
    question: 'Why did you pick this food?',
    placeholder: 'Write text here...',
  },
  {
    id: 'q3',
    question: 'How did you feel after eating?',
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

export type CounterfactualStep = 0 | 1 | 2 | 3;

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

// Stage names for the 3-step reflection process
export const STAGE_NAMES = ['Food', 'Reason', 'Feeling'] as const;

// Per-stage counterfactual workflows, keyed by stage index
export type StageCounterfactualWorkflows = Record<number, CounterfactualWorkflow>;

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
  counterfactualWorkflow?: CounterfactualWorkflow; // Legacy single workflow
  stageWorkflows?: StageCounterfactualWorkflows; // Per-stage workflows (new)
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
