export type RecordingState = 'idle' | 'recording' | 'active-recording';

export interface RecordingEntry {
  id: string;
  timestamp: Date;
  duration: number; // in seconds
  audioUri?: string; // for when we actually implement audio recording
  waveformData?: number[]; // for waveform visualization
}

export interface AppState {
  recordingState: RecordingState;
  currentRecording?: {
    startTime: Date;
    duration: number;
    waveformData: number[];
  };
  recentEntries: RecordingEntry[];
  showRecordingSaved: boolean;
}

export interface RecordingContextType {
  state: AppState;
  startRecording: () => void;
  stopRecording: () => void;
  dismissRecordingSaved: () => void;
} 