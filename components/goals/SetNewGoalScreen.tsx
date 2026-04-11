import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GoalService } from '../../services/goals';

interface SetNewGoalScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

export const SetNewGoalScreen: React.FC<SetNewGoalScreenProps> = ({ onComplete, onBack }) => {
  const [goalText, setGoalText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isSaveEnabled = goalText.trim().length > 0 && !isSaving;

  const handleSave = async () => {
    if (!isSaveEnabled) {
      return;
    }

    try {
      setIsSaving(true);
      await GoalService.createGoal({
        goal: goalText.trim(),
        timeOfDay: ['Morning'],
        intensityFrequency: 'Low (1x per week)',
        locations: '',
      });
      onComplete();
    } catch (error) {
      console.error('Failed to save goal:', error);
      Alert.alert('Error', 'Failed to save goal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Ionicons name="home" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Question Text */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>What goal would you like to set?</Text>
      </View>

      {/* Text Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your goal here..."
          value={goalText}
          onChangeText={setGoalText}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#9ca3af"
          autoFocus
        />
      </View>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.nextButton, !isSaveEnabled && styles.nextButtonDisabled]}
          onPress={handleSave}
          disabled={!isSaveEnabled}
          activeOpacity={0.7}>
          <Text style={[styles.nextButtonText, !isSaveEnabled && styles.nextButtonTextDisabled]}>
            {isSaving ? 'Saving...' : 'Save Goal'}
          </Text>
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
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  questionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  questionText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 36,
  },
  inputContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 16,
    fontSize: 16,
    color: '#374151',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  nextButtonTextDisabled: {
    color: '#ffffff',
  },
});
