import React, { useState, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { MainRecordingScreen } from './MainRecordingScreen';
import { RecordingSavedScreen } from './RecordingSavedScreen';
import { AppState, RecordingEntry, RecordingState } from '../../types/recording';
import { recordingService } from '../../services/recording';
import { sensorService } from '../../services/sensors';
import { useAuth } from '../../contexts/AuthContext';
import { logOut } from '../../services/auth';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

export const RecordingApp: React.FC = () => {
  const { user } = useAuth();
  const [appState, setAppState] = useState<AppState>({
    recordingState: 'idle',
    recentEntries: [],
    showRecordingSaved: false,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTime = useRef<Date | null>(null);
  const currentRecordingId = useRef<string | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Load recent recordings from Firebase
  useEffect(() => {
    if (!user) return;

    const recordingsRef = collection(db, 'users', user.uid, 'recordings');
    const q = query(recordingsRef, orderBy('createdAt', 'desc'), limit(10));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: RecordingEntry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          timestamp: data.createdAt?.toDate() || new Date(),
          duration: data.duration || 0,
          title: data.title,
        };
      });
      
      setAppState(prev => ({ ...prev, recentEntries: entries }));
    });

    return () => unsubscribe();
  }, [user]);

  // Generate random waveform data for visualization
  const generateWaveformData = () => {
    return Array.from({ length: 40 }, () => 0.2 + Math.random() * 0.8);
  };

  const startRecording = async () => {
    try {
      // Request permissions and start recording
      const hasPermission = await recordingService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Audio recording permission is required');
        return;
      }

      // Check sensor availability
      const sensors = await sensorService.checkSensorAvailability();
      if (!sensors.accelerometer || !sensors.gyroscope) {
        Alert.alert(
          'Sensors Unavailable',
          'Motion sensors are required for activity tracking'
        );
      }

      // Start audio recording
      await recordingService.startRecording();
      
      // Generate recording ID and start sensor recording
      currentRecordingId.current = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await sensorService.startRecording(currentRecordingId.current);

      recordingStartTime.current = new Date();

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
          }

          // Update waveform visualization
          setWaveformData(generateWaveformData());

          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop sensor recording
      await sensorService.stopRecording();

      // Get activity summary
      const activitySummary = sensorService.getActivitySummary();

      // Generate title based on time
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const title = `Recording at ${timeString}`;

      // Complete recording (stop, upload, save)
      await recordingService.completeRecording(
        title,
        currentDuration,
        activitySummary
      );

      setAppState({
        ...appState,
        recordingState: 'idle',
        showRecordingSaved: true,
        currentRecording: undefined,
      });

      setCurrentDuration(0);
      setWaveformData([]);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Recording Error', 'Failed to save recording');
      
      // Reset state even on error
      setAppState({
        ...appState,
        recordingState: 'idle',
        currentRecording: undefined,
      });
      setCurrentDuration(0);
      setWaveformData([]);
    }
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