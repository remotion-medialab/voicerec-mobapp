export type RecordingState = 'idle' | 'recording' | 'active-recording';

export interface RecordingStep {
  id: number;
  question: string;
  completed: boolean;
}

export interface RecordingEntry {
  id: string;
  timestamp: Date;
  duration: number; // in seconds
  audioUri?: string; // Local URI or Firebase Storage URL for playback
  fileUrl?: string; // Firebase Storage download URL
  storagePath?: string; // Firebase Storage object path for refresh
  waveformData?: number[]; // for waveform visualization
  stepNumber?: number; // which question step this recording is for
  title?: string;
  goalId?: string; // ID of the linked goal, or undefined for "Miscellaneous"
}

export interface AppState {
  recordingState: RecordingState;
  currentStep: number; // 0-4 for the 5 questions
  recordingSteps: RecordingStep[];
  currentRecording?: {
    startTime: Date;
    duration: number;
    waveformData: number[];
    stepNumber: number;
  };
  recentEntries: RecordingEntry[];
  showRecordingSaved: boolean;
  showFinalSave: boolean;
  sessionNumber?: number; 
}

export interface RecordingContextType {
  state: AppState;
  startRecording: () => void;
  stopRecording: () => void;
  dismissRecordingSaved: () => void;
  nextStep: () => void;
  restartFlow: () => Promise<void>;
}

// Define the 5 questions for the recording flow
export const RECORDING_QUESTIONS: string[] = [
  'What is the situation you engaged in or avoided?',
  'Did you do anything to impact how the situation unfolded, if any?',
  '⁠Can you remember what caught your attention or what you focused on in the situation?',
  'How did you interpret the situation at the time?',
  'Did you notice anything about how you responded emotionally or physically, or through your actions?',
];

// Single-question prompt for condition A
export const SINGLE_QUESTION_CONDITION_A = `Let’s Reflect!

Please describe in detail, without naming anyone:
 what happened, who was involved, when and where it took place, how you felt, and what you tried`;
