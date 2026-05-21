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
  // One sessionId is shared across the 5 step recordings of a single flow,
  // so the list view can group them as "Session N". Reset by restartFlow.
  const sessionId = useRef<string | null>(null);
  // Pre-warm + cache the sensor availability so we don't re-query on every tap.
  const sensorAvailability = useRef<{ accelerometer: boolean; gyroscope: boolean } | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Tier 1 C/D — pre-warm permissions, audio mode, sensor availability on mount.
  // Makes the first tap-to-record instant (no permission round-trip).
  useEffect(() => {
    recordingService.requestPermissions().catch(() => {});
    sensorService
      .checkSensorAvailability()
      .then((s) => {
        sensorAvailability.current = { accelerometer: s.accelerometer, gyroscope: s.gyroscope };
      })
      .catch(() => {
        sensorAvailability.current = { accelerometer: false, gyroscope: false };
      });
  }, []);

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

      // Permission is pre-warmed on mount; this returns instantly if already granted.
      const hasPermission = await recordingService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Audio recording permission is required');
        return;
      }

      // Use the sensor availability cached on mount (no re-query, no second alert).
      const sensors = sensorAvailability.current ?? { accelerometer: false, gyroscope: false };

      console.log('🎵 Starting audio recording...');
      await recordingService.startRecording();

      // Mint a sessionId once per flow — on the first step or whenever the
      // session was reset. All 5 steps share the same id.
      if (!sessionId.current || appState.currentStep === 0) {
        sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      currentRecordingId.current = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // Fire-and-forget sensor start (it's optional and must never block audio).
      if (sensors.accelerometer && sensors.gyroscope) {
        sensorService
          .startRecording(currentRecordingId.current)
          .catch((e) => console.warn('Sensor recording could not be started:', e));
      }

      recordingStartTime.current = new Date();
      console.log(`📱 Recording started with ID: ${currentRecordingId.current}`);

      // Tier 1 B — no warmup. Go straight to active-recording so the waveform
      // is alive from the first tap; the previous 3-second 'recording' phase is gone.
      setAppState((prev) => ({
        ...prev,
        recordingState: 'active-recording',
        currentRecording: {
          startTime: new Date(),
          duration: 0,
          waveformData: [],
          stepNumber: prev.currentStep,
        },
      }));
      setCurrentDuration(0);
      setWaveformData(generateWaveformData());

      // Timer just ticks the duration + refreshes the waveform — no state-machine gate.
      timerRef.current = setInterval(() => {
        setCurrentDuration((prev) => prev + 1);
        setWaveformData(generateWaveformData());
      }, 1000);

      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording');
    }
  };

  // Tier 1 A — optimistic stop. The UI advances IMMEDIATELY. The heavy work
  // (m4a finalize, sensor flush to Firestore, local save, upload queue) all runs
  // in the background so the user perceives ~zero latency between steps.
  const stopRecording = async () => {
    if (!recordingService.isRecording()) {
      console.warn('⚠️ stopRecording called but no active recording found');
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Snapshot everything we need BEFORE state changes (currentStep may advance).
    const stepAtStop = appState.currentStep;
    const durationAtStop = currentDuration;
    const questionAtStop = RECORDING_QUESTIONS[stepAtStop];
    const sessionAtStop = sessionId.current;
    const timeString = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const stepTitle = `Step ${stepAtStop + 1}: ${timeString}`;

    // Flip UI to idle immediately + mark this step completed. Caller advances.
    setAppState((prev) => {
      const updatedSteps = [...prev.recordingSteps];
      if (updatedSteps[stepAtStop]) {
        updatedSteps[stepAtStop] = { ...updatedSteps[stepAtStop], completed: true };
      }
      return {
        ...prev,
        recordingState: 'idle',
        showRecordingSaved: false,
        recordingSteps: updatedSteps,
        currentRecording: undefined,
      };
    });
    setCurrentDuration(0);
    setWaveformData([]);

    // ---- background pipeline ----
    // Sensor stop flushes ~100 readings to Firestore — must NOT block the UI.
    sensorService.stopRecording().catch((e) => console.warn('Sensor stop failed:', e));

    let activitySummary: any = null;
    try {
      activitySummary = sensorService.getActivitySummary();
    } catch (e) {
      console.warn('No activity summary available:', e);
    }

    try {
      const recordingUri = await recordingService.stopRecording();
      if (!recordingUri) {
        console.warn('No recording URI after stop');
        return;
      }

      // Synchronous cache write — instant.
      const localRecordingId = recordingService.saveRecordingLocally(
        stepTitle,
        durationAtStop,
        stepAtStop,
        recordingUri,
        activitySummary,
        questionAtStop,
        sessionAtStop ?? undefined
      );
      console.log(`💾 Saved locally: ${stepTitle} (${localRecordingId})`);

      backgroundUploadService
        .queueForLater(
          recordingUri,
          stepTitle,
          durationAtStop,
          stepAtStop,
          activitySummary,
          questionAtStop,
          sessionAtStop ?? undefined
        )
        .then(() => console.log(`📋 Queued for upload: ${stepTitle}`))
        .catch((e) => console.error('Failed to queue recording:', e));
    } catch (error) {
      console.error('Background stop/save failed:', error);
      // UI has already advanced — surface a non-blocking warning the user can
      // act on later from the summary screen.
      Alert.alert(
        'Saved with warning',
        `Step ${stepAtStop + 1} may not have saved cleanly. You can re-record it from the summary.`
      );
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
    // Reset the session — next "Start" mints a fresh sessionId.
    sessionId.current = null;
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
