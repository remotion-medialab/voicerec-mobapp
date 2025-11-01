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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { REFLECTION_QUESTIONS, ReflectionAnswers } from '../types/session';
import { ReflectionService } from '../services/reflections';

interface RecordingDetailScreenProps {
  sessionNumber: number;
  onBack: () => void;
  onComplete: () => void;
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
  const [answers, setAnswers] = useState<Partial<ReflectionAnswers>>({});
  const [saving, setSaving] = useState(false);

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

      // Sort by step number and combine transcripts
      const transcripts = recordingsSnap.docs
        .sort((a, b) => {
          // Extract step number from document ID (e.g., "step-0", "step-1")
          const stepA = parseInt(a.id.split('-')[1] || '0');
          const stepB = parseInt(b.id.split('-')[1] || '0');
          return stepA - stepB;
        })
        .map((doc) => {
          const data = doc.data();
          const stepNum = parseInt(doc.id.split('-')[1] || '0');
          const transcriptText = data.transcriptionText || '';

          // Format with step label
          if (transcriptText) {
            return `Stage ${stepNum}: ${transcriptText}`;
          }
          return '';
        })
        .filter((text) => text.length > 0);

      const combinedTranscript =
        transcripts.length > 0
          ? transcripts.join('\n\n')
          : 'Transcription not yet available. Please check back later.';

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

      // Save answers to Firestore
      await ReflectionService.saveReflectionAnswers(sessionNumber, answers);

      Alert.alert('Success', 'Your reflections have been saved!', [
        { text: 'OK', onPress: () => onComplete() },
      ]);
    } catch (error) {
      console.error('Error saving reflection answers:', error);
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Sticky Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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

        {/* Bottom padding for fixed button */}
        <View style={{ height: 100 }} />
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
    </View>
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    paddingBottom: 32, // Extra padding for safe area
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
