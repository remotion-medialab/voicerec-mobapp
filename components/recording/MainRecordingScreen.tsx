import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Waveform } from './Waveform';
import { ProgressCircles } from './ProgressCircles';
import { RecordingState, RecordingEntry, RECORDING_QUESTIONS } from '../../types/recording';
import { logOut } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { backgroundUploadService } from '../../services/backgroundUpload';

interface MainRecordingScreenProps {
  recordingState: RecordingState;
  currentStep: number;
  currentDuration: number;
  waveformData: number[];
  recentEntries: RecordingEntry[];
  onStartRecording: () => void;
  onStopRecording: () => Promise<void>;
  onNextStep: () => void;
  onRestartFlow: () => void;
}

export const MainRecordingScreen: React.FC<MainRecordingScreenProps> = ({
  recordingState,
  currentStep,
  currentDuration,
  waveformData,
  recentEntries,
  onStartRecording,
  onStopRecording,
  onNextStep,
  onRestartFlow,
}) => {
  const { userProfile } = useAuth();
  const [showStartButton, setShowStartButton] = useState(true);
  const [uploadStatus, setUploadStatus] = useState({ pending: 0, isUploading: false });

  // Track upload status
  useEffect(() => {
    const checkUploadStatus = () => {
      const status = backgroundUploadService.getUploadStatus();
      setUploadStatus(status);
    };

    // Check immediately
    checkUploadStatus();

    // Check every 2 seconds
    const interval = setInterval(checkUploadStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logOut();
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  };

  const handleStartRecording = () => {
    setShowStartButton(false);
    onStartRecording();
  };

  const [isSaving, setIsSaving] = useState(false);

  // Cross-fade the question text whenever the step changes, instead of
  // a hard snap — keeps the screen feeling stable between steps.
  const questionOpacity = useRef(new Animated.Value(1)).current;
  const lastStepRef = useRef(currentStep);
  useEffect(() => {
    if (lastStepRef.current === currentStep) return;
    lastStepRef.current = currentStep;
    Animated.sequence([
      Animated.timing(questionOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(questionOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep, questionOpacity]);

  // Fade the live recording indicator (red dot + timer) in/out while keeping
  // its slot reserved so the layout below it does not shift.
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const isRecordingAny =
    recordingState === 'recording' || recordingState === 'active-recording';
  useEffect(() => {
    Animated.timing(indicatorOpacity, {
      toValue: isRecordingAny ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isRecordingAny, indicatorOpacity]);

  const handleDone = async () => {
    if (recordingState === 'recording' || recordingState === 'active-recording') {
      try {
        setIsSaving(true);

        // 1. Stop recording and save locally (instant)
        await onStopRecording();

        // 2. Immediately advance to next step (no waiting!)
        setShowStartButton(true);
        setIsSaving(false);

        // Always call onNextStep - it will handle showing final save screen when complete
        onNextStep();

        // 3. Upload happens in background (handled by RecordingApp)
      } catch (error) {
        setIsSaving(false);
        Alert.alert('Error', 'Failed to save recording. Please try again.');
      }
    }
  };

  const isRecording = recordingState === 'recording' || recordingState === 'active-recording';
  const isFlowComplete = currentStep >= RECORDING_QUESTIONS.length;
  const currentQuestion = RECORDING_QUESTIONS[currentStep] || '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header with back button and upload status */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Ionicons name="home" size={20} color="#3b82f6" />
        </TouchableOpacity>

        {uploadStatus.pending > 0 && (
          <View style={styles.uploadStatus}>
            <Ionicons
              name={uploadStatus.isUploading ? 'cloud-upload' : 'cloud-outline'}
              size={16}
              color="#3b82f6"
            />
            <Text style={styles.uploadText}>
              {uploadStatus.isUploading
                ? 'Uploading...'
                : `${uploadStatus.pending} ready for cloud`}
            </Text>
          </View>
        )}
      </View>

      {/* Question Text — cross-fades on step change, slot reserved so the
          layout below never shifts. */}
      <View style={styles.questionContainer}>
        <Animated.Text style={[styles.questionText, { opacity: questionOpacity }]}>
          {isFlowComplete ? '' : currentQuestion}
        </Animated.Text>
      </View>

      {/* Progress Circles */}
      <View style={styles.progressContainer}>
        <ProgressCircles currentStep={currentStep} isRecording={isRecording} />
      </View>

      {/* Waveform — always mounted so the layout never jumps when starting /
          stopping. Idle = quiet flat baseline; recording = animated bars. */}
      <View style={styles.actionContainer}>
        <View style={styles.waveformContainer}>
          <Waveform data={waveformData} isVisible={isRecording} />
          {/* Indicator slot always reserved; only opacity changes. */}
          <Animated.View
            style={[styles.recordingIndicator, { opacity: indicatorOpacity }]}
            pointerEvents={isRecording ? 'auto' : 'none'}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording...</Text>
            <Text style={styles.durationText}>
              {Math.floor(currentDuration / 60)}:
              {(currentDuration % 60).toString().padStart(2, '0')}
            </Text>
          </Animated.View>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.buttonsContainer}>
        {showStartButton && !isRecording && (
          <TouchableOpacity
            onPress={handleStartRecording}
            style={[styles.button, styles.startButton]}>
            <Ionicons name="mic" size={24} color="#9ca3af" style={styles.micIcon} />
            <Text style={styles.startButtonText}>Sure, let&apos;s do it!</Text>
          </TouchableOpacity>
        )}

        {isRecording && (
          <TouchableOpacity
            onPress={handleDone}
            style={[styles.button, styles.doneButton]}
            disabled={isSaving}>
            <Text style={styles.doneButtonText}>{isSaving ? 'Saving...' : 'Done'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onRestartFlow} style={[styles.button, styles.restartButton]}>
          <Text style={styles.restartButtonText}>Restart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  uploadText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  questionContainer: {
    paddingHorizontal: 40,
    paddingVertical: 40,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 32,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 200,
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    marginRight: 12,
  },
  startButtonText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '400',
  },

  waveformContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
    marginRight: 12,
  },
  durationText: {
    fontSize: 16,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  buttonsContainer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  doneButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  restartButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  doneButtonText: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '400',
  },
  restartButtonText: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '400',
  },
});
