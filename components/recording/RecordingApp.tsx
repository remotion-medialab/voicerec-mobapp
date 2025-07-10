import React, { useState, useEffect, useRef } from 'react';
import { MainRecordingScreen } from './MainRecordingScreen';
import { RecordingSavedScreen } from './RecordingSavedScreen';
import { AppState, RecordingEntry, RecordingState } from '../../types/recording';

export const RecordingApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    recordingState: 'idle',
    recentEntries: [
      {
        id: '1',
        timestamp: new Date(2024, 3, 23, 18, 13), // April 23, 6:13 PM
        duration: 120,
      },
      {
        id: '2',
        timestamp: new Date(2024, 3, 22, 9, 5), // April 22, 9:05 AM
        duration: 180,
      },
    ],
    showRecordingSaved: false,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Generate random waveform data for simulation
  const generateWaveformData = () => {
    return Array.from({ length: 40 }, () => Math.random());
  };

  const startRecording = () => {
    const newState: AppState = {
      ...appState,
      recordingState: 'recording',
      currentRecording: {
        startTime: new Date(),
        duration: 0,
        waveformData: [],
      },
    };
    setAppState(newState);
    setCurrentDuration(0);
    setWaveformData([]);

    // Start timer
    timerRef.current = setInterval(() => {
      setCurrentDuration((prev) => {
        const newDuration = prev + 1;

        // After 3 seconds, switch to active recording with waveform
        if (newDuration >= 3) {
          setAppState((prevState) => ({
            ...prevState,
            recordingState: 'active-recording',
          }));
          setWaveformData(generateWaveformData());
        }

        return newDuration;
      });
    }, 1000);

    // Update waveform data every 200ms when in active recording
    const waveformInterval = setInterval(() => {
      if (appState.recordingState === 'active-recording') {
        setWaveformData(generateWaveformData());
      }
    }, 200);

    return () => clearInterval(waveformInterval);
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Create new entry
    const newEntry: RecordingEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      duration: currentDuration,
      waveformData,
    };

    // Add to recent entries (at the beginning)
    const updatedEntries = [newEntry, ...appState.recentEntries];

    setAppState({
      ...appState,
      recordingState: 'idle',
      recentEntries: updatedEntries,
      showRecordingSaved: true,
      currentRecording: undefined,
    });

    setCurrentDuration(0);
    setWaveformData([]);
  };

  const dismissRecordingSaved = () => {
    setAppState((prev) => ({
      ...prev,
      showRecordingSaved: false,
    }));
  };

  const startNewRecording = () => {
    dismissRecordingSaved();
    // Small delay to ensure smooth transition
    setTimeout(() => {
      startRecording();
    }, 100);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (appState.showRecordingSaved) {
    return (
      <RecordingSavedScreen
        recentEntries={appState.recentEntries}
        onStartNewRecording={startNewRecording}
        onDismiss={dismissRecordingSaved}
      />
    );
  }

  return (
    <MainRecordingScreen
      recordingState={appState.recordingState}
      currentDuration={currentDuration}
      waveformData={waveformData}
      recentEntries={appState.recentEntries}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
    />
  );
};
