import React, { useState, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { MainRecordingScreen } from './MainRecordingScreen';
import { RecordingSavedScreen } from './RecordingSavedScreen';
import { FinalSaveScreen } from './FinalSaveScreen';
import {
  AppState,
  RecordingEntry,
  RecordingState,
  RECORDING_QUESTIONS,
} from '../../types/recording';
import { recordingService } from '../../services/recording';
import { sensorService } from '../../services/sensors';
import { useAuth } from '../../contexts/AuthContext';
import { logOut } from '../../services/auth';
import { collection, query, orderBy, limit, onSnapshot, getDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { backgroundUploadService } from '../../services/backgroundUpload';

interface RecordingAppProps {
  onComplete?: () => void;
}

export const RecordingApp: React.FC<RecordingAppProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [appState, setAppState] = useState<AppState>({
    recordingState: 'idle',
    currentStep: 0,
    recordingSteps: RECORDING_QUESTIONS.map((question, index) => ({
      id: index,
      question,
      completed: false,
    })),
    recentEntries: [],
    showRecordingSaved: false,
    showFinalSave: false,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTime = useRef<Date | null>(null);
  const currentRecordingId = useRef<string | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Load recent recordings from AsyncStorage (local first, then cloud)
  useEffect(() => {
    if (!user) return;

    const loadRecordings = async () => {
      try {
        console.log('📋 Loading recordings for user:', user.uid);

        // Load local recordings from AsyncStorage first (only show uploaded ones)
        const localRecordings = await recordingService.getLocalRecordings();
        const localEntries: RecordingEntry[] = localRecordings
          .filter((data: any) => data.fileUrl && data.fileUrl.includes('firebasestorage.googleapis.com')) // Only uploaded recordings
          .map((data: any) => ({
            id: data.id,
            timestamp: new Date(data.createdAt),
            duration: data.duration || 0,
            title: data.title,
            stepNumber: data.stepNumber,
            audioUri: data.fileUrl, // Use Firebase Storage URL
          }));

        console.log('📱 Loaded', localEntries.length, 'local recordings from AsyncStorage');
        
        // Set local recordings immediately
        setAppState((prev) => ({ ...prev, recentEntries: localEntries }));

        // Also try to load from Firestore for any cloud recordings
        try {
          const recordingsRef = collection(db, 'recordings', user.uid, 'sessions');
          const q = query(recordingsRef, orderBy('createdAt', 'desc'), limit(10));
          const snapshot = await getDocs(q);
          
          console.log('☁️ Received', snapshot.docs.length, 'recordings from Firestore');
          const cloudEntries: RecordingEntry[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              timestamp: data.createdAt?.toDate() || new Date(),
              duration: data.duration || 0,
              title: data.title,
              stepNumber: data.stepNumber,
              audioUri: data.audioUri || data.fileUrl,
            };
          });

          // Merge local and cloud recordings, remove duplicates, sort by timestamp
          const allEntries = [...localEntries, ...cloudEntries];
          const uniqueEntries = allEntries.filter((entry, index, self) => 
            index === self.findIndex(e => e.title === entry.title && e.stepNumber === entry.stepNumber)
          );
          
          const sortedEntries = uniqueEntries
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 10);

          setAppState((prev) => ({ ...prev, recentEntries: sortedEntries }));
        } catch (firestoreError) {
          console.warn('❌ Firestore not available, using local recordings only:', firestoreError);
          // Continue with local recordings only
        }
      } catch (error) {
        console.error('Error loading recordings:', error);
        setAppState((prev) => ({ ...prev, recentEntries: [] }));
      }
    };

    loadRecordings();
  }, [user]);

  // Generate random waveform data for visualization
  const generateWaveformData = () => {
    return Array.from({ length: 40 }, () => 0.2 + Math.random() * 0.8);
  };

  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording...');

      // Request permissions and start recording
      const hasPermission = await recordingService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Audio recording permission is required');
        return;
      }

      // Check sensor availability
      const sensors = await sensorService.checkSensorAvailability();
      if (!sensors.accelerometer || !sensors.gyroscope) {
        Alert.alert('Sensors Unavailable', 'Motion sensors are required for activity tracking');
      }

      console.log('🎵 Starting audio recording...');
      // Start audio recording
      await recordingService.startRecording();

      // Generate recording ID and start sensor recording
      currentRecordingId.current = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await sensorService.startRecording(currentRecordingId.current);

      recordingStartTime.current = new Date();
      console.log(`📱 Recording started with ID: ${currentRecordingId.current}`);

      const newState: AppState = {
        ...appState,
        recordingState: 'recording',
        currentRecording: {
          startTime: new Date(),
          duration: 0,
          waveformData: [],
          stepNumber: appState.currentStep,
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

      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      // Check if we're actually recording
      if (!recordingService.isRecording()) {
        console.warn('⚠️ stopRecording called but no active recording found');
        Alert.alert('Recording Error', 'No active recording found');
        return;
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      console.log('🛑 Stopping recording...');

      // Stop sensor recording
      await sensorService.stopRecording();

      // Get activity summary
      const activitySummary = sensorService.getActivitySummary();

      // Generate title based on step and time
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const stepTitle = `Step ${appState.currentStep + 1}: ${timeString}`;

      console.log(`📝 Saving recording: ${stepTitle}`);

      // Stop recording and get local URI (instant)
      const recordingUri = await recordingService.stopRecording();
      
      if (recordingUri) {
        // Save to AsyncStorage instantly (no waiting for cloud)
        const localRecordingId = await recordingService.saveRecordingLocally(
          stepTitle,
          currentDuration,
          appState.currentStep,
          recordingUri,
          activitySummary,
          RECORDING_QUESTIONS[appState.currentStep]
        );

        // Queue for later upload to Firebase Storage (when user chooses to upload to cloud)
        backgroundUploadService
          .queueForLater(
            recordingUri,
            stepTitle,
            currentDuration,
            appState.currentStep,
            activitySummary,
            RECORDING_QUESTIONS[appState.currentStep]
          )
          .then(() => {
            console.log(`📋 Recording queued for later upload: ${stepTitle}`);
          })
          .catch((error) => {
            console.error('Failed to queue recording:', error);
          });

        console.log(`💾 Recording saved locally: ${stepTitle}`);
        console.log(`📱 Local recording ID: ${localRecordingId}`);
      }

      // Mark current step as completed
      const updatedSteps = [...appState.recordingSteps];
      updatedSteps[appState.currentStep].completed = true;

      setAppState((prev) => ({
        ...prev,
        recordingState: 'idle',
        showRecordingSaved: false,
        recordingSteps: updatedSteps,
        currentRecording: undefined,
      }));

      setCurrentDuration(0);
      setWaveformData([]);
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Recording Error', 'Failed to save recording. Please try again.');

      // Reset state even on error
      setAppState((prev) => ({
        ...prev,
        recordingState: 'idle',
        currentRecording: undefined,
      }));
      setCurrentDuration(0);
      setWaveformData([]);
    }
  };

  const nextStep = () => {
    if (appState.currentStep < RECORDING_QUESTIONS.length - 1) {
      setAppState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        showRecordingSaved: false,
      }));
    } else {
      // All steps completed - show final save screen
      setAppState((prev) => ({
        ...prev,
        showFinalSave: true,
        showRecordingSaved: false,
      }));
    }
  };

  const restartFlow = () => {
    setAppState((prev) => ({
      ...prev,
      currentStep: 0,
      recordingState: 'idle',
      showRecordingSaved: false,
      showFinalSave: false,
      recordingSteps: RECORDING_QUESTIONS.map((question, index) => ({
        id: index,
        question,
        completed: false,
      })),
      currentRecording: undefined,
    }));
    setCurrentDuration(0);
    setWaveformData([]);
  };

  const handleFinalSave = async () => {
    // Start uploading all queued recordings to cloud
    try {
      console.log('🚀 Starting cloud upload for all recordings...');
      await backgroundUploadService.startUploading();

      // Upload will complete automatically and onComplete will be called from FinalSaveScreen
    } catch (error) {
      console.error('Failed to start upload:', error);
      Alert.alert(
        'Upload Error',
        'Failed to start cloud upload. Your recordings are still saved locally.'
      );
    }
  };

  const handleFinalSaveBack = () => {
    // Go back to the last recording step
    setAppState((prev) => ({
      ...prev,
      showFinalSave: false,
      currentStep: RECORDING_QUESTIONS.length - 1,
    }));
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

  if (appState.showFinalSave) {
    return (
      <FinalSaveScreen
        onSave={handleFinalSave}
        onBack={handleFinalSaveBack}
        onComplete={onComplete || restartFlow}
      />
    );
  }

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
      currentStep={appState.currentStep}
      currentDuration={currentDuration}
      waveformData={waveformData}
      recentEntries={appState.recentEntries}
      onStartRecording={startRecording}
      onStopRecording={() => stopRecording()}
      onNextStep={nextStep}
      onRestartFlow={restartFlow}
    />
  );
};
