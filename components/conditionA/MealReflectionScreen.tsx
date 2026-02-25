import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { useAuth } from '../../contexts/AuthContext';
import { reflectionRecordingService } from '../../services/reflectionRecordingService';
import { transcribeAudio } from '../../services/transcriptionService';
import { createMealReflection } from '../../services/mealReflectionService';
import {
  REFLECTION_QUESTIONS,
  MealReflectionResponse,
} from '../../types/mealReflection';

type QuestionState =
  | 'idle'           // waiting to start recording
  | 'recording'      // actively recording
  | 'processing'     // uploading + transcribing
  | 'reviewing'      // showing transcript, can re-record or continue
  | 'saving';        // final Firestore save

interface SavedResponse {
  recordingUrl: string;
  transcriptText: string;
  durationSec: number;
  localUri: string;
}

export interface MealReflectionScreenProps {
  mealLogId?: string;
  mealSessionId?: string;
  onDone: () => void;
}

export const MealReflectionScreen: React.FC<MealReflectionScreenProps> = ({
  mealLogId,
  mealSessionId,
  onDone,
}) => {
  const { user } = useAuth();

  const [questionIdx, setQuestionIdx] = useState(0);
  const [questionState, setQuestionState] = useState<QuestionState>('idle');
  const [responses, setResponses] = useState<(SavedResponse | null)[]>([null, null, null]);
  const [processingError, setProcessingError] = useState<string | null>(null);

  // Recording duration timer
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = useRef<number>(0);

  // Playback sound
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, [stopTimer]);

  const startTimer = () => {
    recordingStartRef.current = Date.now();
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000));
    }, 1000);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    setProcessingError(null);
    const granted = await reflectionRecordingService.requestPermissions();
    if (!granted) {
      Alert.alert(
        'Microphone Permission Required',
        'Please enable microphone access in your device settings to record reflections.'
      );
      return;
    }
    try {
      await reflectionRecordingService.startRecording();
      setQuestionState('recording');
      startTimer();
    } catch (err) {
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    stopTimer();
    setQuestionState('processing');

    try {
      const localUri = await reflectionRecordingService.stopRecording();
      if (!localUri || !user) {
        throw new Error('Recording failed — no audio captured.');
      }

      const recordedDuration = duration;

      // Upload to Firebase Storage
      const recordingUrl = await reflectionRecordingService.uploadRecording(localUri, user.uid);

      // Transcribe via Whisper
      let transcriptText = '';
      try {
        transcriptText = await transcribeAudio(localUri);
      } catch (transcribeErr) {
        console.warn('Transcription failed, continuing without transcript:', transcribeErr);
        transcriptText = '';
      }

      const updated = [...responses];
      updated[questionIdx] = { recordingUrl, transcriptText, durationSec: recordedDuration, localUri };
      setResponses(updated);
      setQuestionState('reviewing');
    } catch (err) {
      console.error('Processing failed:', err);
      setProcessingError(String(err instanceof Error ? err.message : err));
      setQuestionState('idle');
    }
  };

  const handleReRecord = async () => {
    // Unload any playing sound
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setIsPlaying(false);

    const updated = [...responses];
    updated[questionIdx] = null;
    setResponses(updated);
    setDuration(0);
    setQuestionState('idle');
  };

  const handlePlayback = async () => {
    const res = responses[questionIdx];
    if (!res) return;

    if (isPlaying) {
      await soundRef.current?.pauseAsync().catch(() => {});
      setIsPlaying(false);
      return;
    }

    try {
      await soundRef.current?.unloadAsync().catch(() => {});
      const { sound } = await Audio.Sound.createAsync(
        { uri: res.localUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch {
      Alert.alert('Playback Error', 'Could not play the recording.');
    }
  };

  const handleNext = () => {
    // Unload playback
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setIsPlaying(false);
    setDuration(0);
    setProcessingError(null);

    if (questionIdx < REFLECTION_QUESTIONS.length - 1) {
      setQuestionIdx(questionIdx + 1);
      setQuestionState('idle');
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    setIsPlaying(false);
    setDuration(0);
    setProcessingError(null);

    const updated = [...responses];
    // Mark as skipped by leaving null — we handle it in handleFinish
    updated[questionIdx] = null;
    setResponses(updated);

    if (questionIdx < REFLECTION_QUESTIONS.length - 1) {
      setQuestionIdx(questionIdx + 1);
      setQuestionState('idle');
    } else {
      handleFinish(updated);
    }
  };

  const handleFinish = async (overrideResponses?: (SavedResponse | null)[]) => {
    if (!user) return;
    setQuestionState('saving');

    const finalResponses = overrideResponses ?? responses;

    const reflectionResponses: MealReflectionResponse[] = REFLECTION_QUESTIONS.map(
      (q, i) => ({
        questionIndex: i,
        questionText: q,
        recordingUrl: finalResponses[i]?.recordingUrl ?? '',
        transcriptText: finalResponses[i]?.transcriptText ?? '',
        durationSec: finalResponses[i]?.durationSec ?? 0,
        skipped: !finalResponses[i],
      })
    );

    try {
      await createMealReflection({
        userId: user.uid,
        ...(mealLogId ? { mealLogId } : {}),
        ...(mealSessionId ? { mealSessionId } : {}),
        responses: reflectionResponses,
        isComplete: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (err) {
      console.error('Failed to save reflection:', err);
      // Don't block user — reflection saved partially is better than crashing
    } finally {
      onDone();
    }
  };

  const currentQuestion = REFLECTION_QUESTIONS[questionIdx];
  const currentResponse = responses[questionIdx];
  const isLastQuestion = questionIdx === REFLECTION_QUESTIONS.length - 1;

  if (questionState === 'saving') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.savingText}>Saving your reflection…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Leave Reflection?',
              'Your progress will not be saved.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Leave', style: 'destructive', onPress: onDone },
              ]
            );
          }}
          disabled={questionState === 'processing'}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.progressLabel}>
          Question {questionIdx + 1} of {REFLECTION_QUESTIONS.length}
        </Text>
      </View>

      {/* Progress dots */}
      <View style={styles.progressDots}>
        {REFLECTION_QUESTIONS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < questionIdx && styles.dotComplete,
              i === questionIdx && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Question */}
      <Text style={styles.questionText}>{currentQuestion}</Text>

      {/* State-based content */}
      {questionState === 'idle' && (
        <View style={styles.actionSection}>
          {processingError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{processingError}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.recordButton} onPress={handleStartRecording} activeOpacity={0.8}>
            <View style={styles.micIcon}>
              <Text style={styles.micEmoji}>🎙</Text>
            </View>
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip this question</Text>
          </TouchableOpacity>
        </View>
      )}

      {questionState === 'recording' && (
        <View style={styles.actionSection}>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingLabel}>Recording…</Text>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>

          <TouchableOpacity style={styles.stopButton} onPress={handleStopRecording} activeOpacity={0.8}>
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {questionState === 'processing' && (
        <View style={styles.actionSection}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.processingText}>Uploading & transcribing…</Text>
        </View>
      )}

      {questionState === 'reviewing' && currentResponse && (
        <View style={styles.reviewSection}>
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>Your response</Text>
            {currentResponse.transcriptText ? (
              <Text style={styles.transcriptText}>{currentResponse.transcriptText}</Text>
            ) : (
              <Text style={styles.transcriptEmpty}>No transcript available</Text>
            )}
            <Text style={styles.durationChip}>{formatDuration(currentResponse.durationSec)}</Text>
          </View>

          <View style={styles.reviewActions}>
            <TouchableOpacity style={styles.playbackButton} onPress={handlePlayback} activeOpacity={0.8}>
              <Text style={styles.playbackButtonText}>{isPlaying ? '⏸ Pause' : '▶ Play'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rerecordButton} onPress={handleReRecord} activeOpacity={0.8}>
              <Text style={styles.rerecordButtonText}>Re-record</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {isLastQuestion ? 'Finish Reflection' : 'Next Question →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  centered: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  savingText: { fontSize: 15, color: '#6b7280' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: { fontSize: 16, color: '#6b7280' },
  progressLabel: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  dotActive: { backgroundColor: '#3b82f6', width: 24 },
  dotComplete: { backgroundColor: '#22c55e' },
  questionText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#9ca3af',
    lineHeight: 32,
    marginBottom: 48,
    textAlign: 'center',
  },
  actionSection: {
    alignItems: 'center',
    gap: 20,
  },
  recordButton: {
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 48,
    width: '100%',
  },
  micIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micEmoji: { fontSize: 26 },
  recordButtonText: { fontSize: 16, color: '#6b7280', fontWeight: '400' },
  skipButton: { paddingVertical: 8 },
  skipText: { fontSize: 14, color: '#9ca3af', textDecorationLine: 'underline' },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingLabel: { fontSize: 15, color: '#3b82f6', fontWeight: '500' },
  durationText: { fontSize: 15, color: '#6b7280', fontFamily: 'monospace' },
  stopButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
    width: '100%',
  },
  stopButtonText: { fontSize: 16, color: '#9ca3af', fontWeight: '400' },
  processingText: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  errorText: { fontSize: 13, color: '#dc2626' },
  reviewSection: {
    gap: 16,
  },
  transcriptCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  transcriptLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  transcriptText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  transcriptEmpty: { fontSize: 14, color: '#9ca3af', fontStyle: 'italic' },
  durationChip: { fontSize: 12, color: '#9ca3af', alignSelf: 'flex-end' },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  playbackButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  playbackButtonText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  rerecordButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rerecordButtonText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  nextButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
