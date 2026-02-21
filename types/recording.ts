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
  sessionNumber?: number; // which session this recording belongs to
}

export interface AppState {
  recordingState: RecordingState;
  currentStep: number; // 0-2 for the 3 questions
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

// Define the 3 questions for the recording flow
export const RECORDING_QUESTIONS: string[] = [
  'What food did you eat?',
  'Why did you pick this food?',
  'How did you feel after eating?',
];

