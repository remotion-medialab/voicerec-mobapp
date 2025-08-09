import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { MainRecordingScreen } from './MainRecordingScreen';
import { RecordingSavedScreen } from './RecordingSavedScreen';
import { FinalSaveScreen } from './FinalSaveScreen';
import { AppState, RecordingEntry, RECORDING_QUESTIONS } from '../../types/recording';
import { recordingService } from '../../services/recording';
import { sensorService } from '../../services/sensors';
import { useAuth } from '../../contexts/AuthContext';
// import { logOut } from '../../services/auth';
import {
  collection,
  doc,
  collectionGroup,
  query,
  orderBy,
  limit,
  // onSnapshot,
  // getDoc,
  getDocs,
  where,
  setDoc,
} from 'firebase/firestore';
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
    sessionNumber: undefined,
  });
  const [recordingsLoading, setRecordingsLoading] = useState(true);
  const [recordingsError, setRecordingsError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTime = useRef<Date | null>(null);
  const currentRecordingId = useRef<string | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Determine current session number (continue latest incomplete, else next sequential)
  useEffect(() => {
    const initSessionNumber = async () => {
      if (!user) return;
      try {
        // users/{uid}/sessions sorted by sessionNumber desc
        const sessionsCol = collection(db, 'users', user.uid, 'sessions');
        const qSess = query(sessionsCol, orderBy('sessionNumber', 'desc'), limit(1));
        const snap = await getDocs(qSess);
        let sessionNumber = 1;
        if (!snap.empty) {
          const last = snap.docs[0].data() as any;
          const lastNum = last.sessionNumber || 1;
          const isComplete = !!last.isComplete;
          sessionNumber = isComplete ? lastNum + 1 : lastNum;
        }
        setAppState((prev) => ({ ...prev, sessionNumber }));
        // Ensure the session doc exists
        const sessionDocRef = doc(db, 'users', user.uid, 'sessions', `session${sessionNumber}`);
        await setDoc(
          sessionDocRef,
          {
            userId: user.uid,
            sessionNumber,
            isComplete: false,
            createdAt: new Date(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Failed to initialize session number', e);
      }
    };
    initSessionNumber();
  }, [user]);

  // Load recent recordings from cloud only (NO local AsyncStorage fallback)
  useEffect(() => {
    if (!user) {
      setRecordingsLoading(false);
      return;
    }

    const loadRecordings = async () => {
      try {
        setRecordingsLoading(true);
        setRecordingsError(null);
        console.log('☁️ Loading recordings from cloud ONLY for user:', user.uid);

        // Prefer new hierarchical structure via collection group
        let snapshot;
        try {
          const cg = collectionGroup(db, 'recordings');
          const q1 = query(
            cg,
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(10)
          );
          snapshot = await getDocs(q1);
        } catch {
          // Fallback to legacy path
          const recordingsRef = collection(db, 'recordings', user.uid, 'sessions');
          const q2 = query(recordingsRef, orderBy('createdAt', 'desc'), limit(10));
          snapshot = await getDocs(q2);
        }

        // If still empty, enumerate new tree: users/{uid}/sessions/*/recordings
        let manualDocs: Array<{ id: string; data: any }> = [];
        if (snapshot.empty) {
          try {
            const sessionsCol = collection(db, 'users', user.uid, 'sessions');
            const sessionsSnap = await getDocs(sessionsCol);
            for (const sess of sessionsSnap.docs) {
              const recsCol = collection(
                doc(db, 'users', user.uid, 'sessions', sess.id),
                'recordings'
              );
              const recsSnap = await getDocs(recsCol);
              recsSnap.docs.forEach((d) => manualDocs.push({ id: d.id, data: d.data() }));
            }
          } catch (e) {
            console.warn('⚠️ Enumerating sessions failed:', e);
          }
        }

        console.log('📦 Loaded', snapshot.docs.length, 'cloud recordings');

        const docsSource = snapshot.empty
          ? manualDocs
          : snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));
        const cloudEntries: RecordingEntry[] = docsSource
          .map((docLike) => {
            const data = docLike.data;
            const audioUrl = data.fileUrl || data.audioUri;

            // Only include recordings with valid audio URLs
            if (!audioUrl) {
              console.warn(`⚠️ Skipping recording ${docLike.id} - no audio URL`);
              return null;
            }

            return {
              id: docLike.id,
              timestamp: data.createdAt?.toDate
                ? data.createdAt.toDate()
                : new Date(data.createdAt || Date.now()),
              duration: data.duration || 0,
              title: data.title || `Recording ${data.stepNumber || 'Unknown'}`,
              stepNumber: data.stepNumber || 0,
              audioUri: audioUrl,
            };
          })
          .filter(Boolean) as RecordingEntry[];

        // Sort by timestamp (newest first)
        const sortedEntries = cloudEntries.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );

        setAppState((prev) => ({ ...prev, recentEntries: sortedEntries }));
        setRecordingsLoading(false);

        console.log('✅ Successfully loaded', sortedEntries.length, 'recordings from cloud');
      } catch (error) {
        console.error('❌ Error loading recordings from cloud:', error);
        setRecordingsError(
          'Failed to load recordings from cloud. Please check your internet connection.'
        );
        setAppState((prev) => ({ ...prev, recentEntries: [] }));
        setRecordingsLoading(false);
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

      // Start sensor recording with current session/step
      currentRecordingId.current = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await sensorService.startRecording(appState.sessionNumber || 1, appState.currentStep + 1);

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
        // Ensure session number exists
        sessionNumber: appState.sessionNumber,
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
            appState.sessionNumber || 1,
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
      sessionNumber: (prev.sessionNumber || 0) + 1,
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
      recordingsLoading={recordingsLoading}
      recordingsError={recordingsError}
      onStartRecording={startRecording}
      onStopRecording={() => stopRecording()}
      onNextStep={nextStep}
      onRestartFlow={restartFlow}
    />
  );
};
