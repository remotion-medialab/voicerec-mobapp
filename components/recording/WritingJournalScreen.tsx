import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { RECORDING_QUESTIONS } from '../../types/recording';

interface WritingJournalScreenProps {
  goalId?: string | null;
  onComplete?: () => void;
}

const STAGE_NAMES = ['Food', 'Reason', 'Feeling'];

export const WritingJournalScreen: React.FC<WritingJournalScreenProps> = ({
  goalId,
  onComplete,
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [textEntries, setTextEntries] = useState<string[]>(['', '', '']);
  const [sessionNumber, setSessionNumber] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  const totalSteps = 3;

  // Initialize session number
  useEffect(() => {
    const initSessionNumber = async () => {
      if (!user) return;
      try {
        const sessionsCol = collection(db, 'users', user.uid, 'sessions');
        const qSess = query(sessionsCol, orderBy('sessionNumber', 'desc'), limit(1));
        const snap = await getDocs(qSess);
        let newSessionNumber = 1;
        if (!snap.empty) {
          const last = snap.docs[0].data() as any;
          const lastNum = last.sessionNumber || 1;
          const isComplete = !!last.isComplete;
          newSessionNumber = isComplete ? lastNum + 1 : lastNum;
        }
        setSessionNumber(newSessionNumber);

        // Create session document
        const sessionDocRef = doc(db, 'users', user.uid, 'sessions', `session${newSessionNumber}`);
        await setDoc(
          sessionDocRef,
          {
            userId: user.uid,
            sessionNumber: newSessionNumber,
            isComplete: false,
            createdAt: new Date(),
            goalId: goalId || null,
            type: 'writing', // Mark as writing session
            reflectionStatus: 0,
          },
          { merge: true }
        );
      } catch (e) {
        console.error('Failed to initialize session number', e);
      }
    };
    initSessionNumber();
  }, [user, goalId]);

  const handleNext = async () => {
    const currentText = textEntries[currentStep].trim();

    if (!currentText) {
      Alert.alert('Empty Entry', 'Please write something before continuing.');
      return;
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save all entries and complete the session
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!user || sessionNumber === undefined) {
      Alert.alert('Error', 'Session not initialized properly.');
      return;
    }

    setIsSaving(true);

    try {
      // Save each text entry as a "recording" document
      for (let i = 0; i < totalSteps; i++) {
        const text = textEntries[i].trim();
        if (text) {
          const recordingDocRef = doc(
            db,
            'users',
            user.uid,
            'sessions',
            `session${sessionNumber}`,
            'recordings',
            `step${i}`
          );

          await setDoc(recordingDocRef, {
            userId: user.uid,
            sessionNumber,
            stepNumber: i,
            type: 'text',
            content: text,
            title: STAGE_NAMES[i],
            createdAt: new Date(),
          });
        }
      }

      // Mark session as complete
      const sessionDocRef = doc(db, 'users', user.uid, 'sessions', `session${sessionNumber}`);
      await setDoc(
        sessionDocRef,
        {
          isComplete: true,
          completedAt: new Date(),
          reflectionStatus: 0, // Default to 0 for new entries
        },
        { merge: true }
      );

      Alert.alert('Success', 'Your written reflection has been saved!', [
        {
          text: 'OK',
          onPress: () => {
            setIsSaving(false);
            onComplete?.();
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving written reflection:', error);
      Alert.alert('Error', 'Failed to save your reflection. Please try again.');
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentQuestion = RECORDING_QUESTIONS[currentStep];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onComplete} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Ionicons name="home" size={20} color="#3b82f6" />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {`Stage ${currentStep + 1} of ${totalSteps}`}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {/* Stage Name */}
        <View style={styles.stageContainer}>
          <Text style={styles.stageName}>{STAGE_NAMES[currentStep]}</Text>
        </View>

        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion}</Text>
        </View>

        {/* Text Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            multiline
            placeholder="Type your thoughts here..."
            placeholderTextColor="#9ca3af"
            value={textEntries[currentStep]}
            onChangeText={(text) => {
              const newEntries = [...textEntries];
              newEntries[currentStep] = text;
              setTextEntries(newEntries);
            }}
            autoFocus
          />
        </View>

        {/* Navigation hint for multi-step */}
        {currentStep < totalSteps - 1 && (
          <Text style={styles.hintText}>
            You can go back to edit previous stages using the back button
          </Text>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.backNavButton}
            onPress={handleBack}
            disabled={isSaving}>
            <Ionicons name="arrow-back" size={20} color="#3b82f6" />
            <Text style={styles.backNavText}>Back</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={[styles.nextButton, isSaving && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isSaving}>
          {isSaving ? (
            <Text style={styles.nextButtonText}>Saving...</Text>
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentStep === totalSteps - 1 ? 'Complete' : 'Next'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stageContainer: {
    marginBottom: 16,
  },
  stageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '400',
    color: '#1f2937',
    lineHeight: 30,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    minHeight: 300,
  },
  textInput: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
    textAlignVertical: 'top',
    minHeight: 280,
  },
  hintText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backNavText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
