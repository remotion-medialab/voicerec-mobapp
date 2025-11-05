import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { doc, getDoc, collection, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { REFLECTION_QUESTIONS, ReflectionAnswers } from '../types/session';
import { ReflectionService } from '../services/reflections';

interface RecordingDetailScreenProps {
  sessionNumber: number;
  onBack: () => void;
  onComplete: () => void;
}

interface RecordingData {
  id: string;
  stepNumber: number;
  audioUri: string;
  duration: number;
  transcriptionText: string;
}

export const RecordingDetailScreen: React.FC<RecordingDetailScreenProps> = ({
  sessionNumber,
  onBack,
  onComplete,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goalName, setGoalName] = useState('');
  const [transcript, setTranscript] = useState('');
  const [recordings, setRecordings] = useState<RecordingData[]>([]);
  const [answers, setAnswers] = useState<Partial<ReflectionAnswers>>({});
  const [saving, setSaving] = useState(false);

  // Audio playback state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);

  useEffect(() => {
    loadSessionData();
  }, []);

  const loadSessionData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load session document
      const sessionRef = doc(db, 'users', user.uid, 'sessions', `session${sessionNumber}`);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        console.error('Session not found');
        Alert.alert('Error', 'Session not found');
        onBack();
        return;
      }

      const sessionData = sessionSnap.data();

      // Load goal if exists
      if (sessionData.goalId) {
        const goalRef = doc(db, 'users', user.uid, 'goals', sessionData.goalId);
        const goalSnap = await getDoc(goalRef);
        if (goalSnap.exists()) {
          setGoalName(goalSnap.data().goal);
        } else {
          setGoalName('Goal (deleted)');
        }
      } else {
        setGoalName('Miscellaneous');
      }

      // Load recordings and combine transcripts
      const recordingsRef = collection(
        db,
        'users',
        user.uid,
        'sessions',
        `session${sessionNumber}`,
        'recordings'
      );
      const recordingsSnap = await getDocs(recordingsRef);

      // Sort by step number
      const sortedDocs = recordingsSnap.docs.sort((a, b) => {
        const stepA = parseInt(a.id.split('-')[1] || '0');
        const stepB = parseInt(b.id.split('-')[1] || '0');
        return stepA - stepB;
      });

      // Build recordings array with audio URLs
      const recordingsData: RecordingData[] = sortedDocs.map((doc) => {
        const data = doc.data();
        const stepNum = parseInt(doc.id.split('-')[1] || '0');
        return {
          id: doc.id,
          stepNumber: stepNum,
          audioUri: data.fileUrl || data.audioUri || '',
          duration: data.duration || 0,
          transcriptionText: data.transcriptionText || '',
        };
      });

      setRecordings(recordingsData);

      // Combine transcripts for display
      // For condition A (1 recording): Show single transcript without "Stage" label
      // For condition B/C (5 recordings): Concatenate with "Stage N:" labels
      let combinedTranscript = '';

      if (recordingsData.length === 1) {
        // Condition A: Single recording - just show the transcript
        const singleTranscript = recordingsData[0].transcriptionText;
        combinedTranscript = singleTranscript || 'Transcription not yet available. Please check back later.';
      } else {
        // Condition B/C: Multiple recordings - concatenate with stage labels
        const transcripts = recordingsData
          .map((rec) => {
            if (rec.transcriptionText) {
              return `Stage ${rec.stepNumber}: ${rec.transcriptionText}`;
            }
            return '';
          })
          .filter((text) => text.length > 0);

        combinedTranscript =
          transcripts.length > 0
            ? transcripts.join('\n\n')
            : 'Transcription not yet available. Please check back later.';
      }

      setTranscript(combinedTranscript);

      // Load existing answers (if any)
      const existingAnswers = await ReflectionService.getReflectionAnswers(sessionNumber);
      if (existingAnswers) {
        setAnswers(existingAnswers);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading session data:', error);
      Alert.alert('Error', 'Failed to load session data. Please try again.');
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: keyof ReflectionAnswers, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleDone = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Calculate reflection status based on answers
      const totalQuestions = REFLECTION_QUESTIONS.length; // 5 questions
      const filledAnswers = Object.values(answers).filter(
        (answer) => answer && answer.trim().length > 0
      ).length;

      let reflectionStatus: number;
      if (filledAnswers === 0) {
        reflectionStatus = 0; // Red - no answers
      } else if (filledAnswers < totalQuestions) {
        reflectionStatus = 1; // Yellow - partial answers
      } else {
        reflectionStatus = 2; // Green - all answers filled
      }

      console.log('💾 Saving reflections:', {
        sessionNumber,
        filledAnswers,
        totalQuestions,
        reflectionStatus,
        userId: user.uid,
      });

      const sessionRef = doc(db, 'users', user.uid, 'sessions', `session${sessionNumber}`);
      console.log('📝 Session document path:', sessionRef.path);

      // Save both reflection answers AND status together in one operation
      await setDoc(
        sessionRef,
        {
          reflectionAnswers: answers,
          reflectionStatus,
          answersCompletedAt: serverTimestamp(),
          reflectionCompletedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log('✅ Session updated with:', {
        reflectionStatus,
        answersCount: filledAnswers,
      });

      Alert.alert('Success', 'Your reflections have been saved!', [
        { text: 'OK', onPress: () => onComplete() },
      ]);
    } catch (error) {
      console.error('❌ Error saving reflection answers:', error);
      Alert.alert('Error', 'Failed to save your reflections. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Sticky Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Goal Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Goal</Text>
          <Text style={styles.goalText}>{goalName}</Text>
        </View>

        {/* Transcript Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Transcript</Text>
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        </View>

        {/* Reflection Questions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reflection Questions</Text>

          {REFLECTION_QUESTIONS.map((question) => (
            <View key={question.id} style={styles.questionContainer}>
              <Text style={styles.questionText}>{question.question}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={question.placeholder}
                placeholderTextColor="#9ca3af"
                value={answers[question.id] || ''}
                onChangeText={(value) => handleAnswerChange(question.id, value)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          ))}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Fixed Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.doneButton, saving && styles.doneButtonDisabled]}
          onPress={handleDone}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.doneButtonText}>Done</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  goalText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
  },
  transcriptBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  transcriptText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 24,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 100,
  },
  bottomContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
  doneButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
});
