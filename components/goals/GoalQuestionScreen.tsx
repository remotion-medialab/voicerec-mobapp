import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuestionConfig, TimeOfDay, IntensityFrequency } from '../../types/goals';

interface GoalQuestionScreenProps {
  config: QuestionConfig;
  onNext: () => void;
  onBack: () => void;
  onUpdate: (value: any) => void;
  currentValue?: any;
  progress: number;
  isLast?: boolean;
}

export const GoalQuestionScreen: React.FC<GoalQuestionScreenProps> = ({
  config,
  onNext,
  onBack,
  onUpdate,
  currentValue,
  progress,
  isLast = false,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [textInput, setTextInput] = useState<string>('');

  // Initialize state based on current value and question type
  useEffect(() => {
    if (config.type === 'multiple-choice' && currentValue) {
      if (config.multipleSelection) {
        setSelectedOptions(Array.isArray(currentValue) ? currentValue : []);
      } else {
        setSelectedOptions([currentValue]);
      }
    } else if (config.type === 'text-input' && currentValue) {
      setTextInput(currentValue);
    }
  }, [currentValue, config.type, config.multipleSelection]);

  const handleOptionSelect = (option: string) => {
    if (config.multipleSelection) {
      const newSelection = selectedOptions.includes(option)
        ? selectedOptions.filter((item) => item !== option)
        : [...selectedOptions, option];

      setSelectedOptions(newSelection);
      onUpdate(newSelection);
    } else {
      setSelectedOptions([option]);
      onUpdate(option);
    }
  };

  const handleTextChange = (text: string) => {
    setTextInput(text);
    onUpdate(text);
  };

  const isNextEnabled = () => {
    if (config.type === 'multiple-choice') {
      return selectedOptions.length > 0;
    } else if (config.type === 'text-input') {
      return textInput.trim().length > 0;
    }
    return false;
  };

  const renderMultipleChoice = () => {
    return (
      <View style={styles.optionsContainer}>
        {config.options?.map((option, index) => {
          const isSelected = selectedOptions.includes(option);
          return (
            <TouchableOpacity
              key={index}
              style={[styles.optionButton, isSelected && styles.selectedOption]}
              onPress={() => handleOptionSelect(option)}
              activeOpacity={0.7}>
              <View style={styles.optionContent}>
                <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                  {option}
                </Text>
                {isSelected && <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderTextInput = () => {
    return (
      <View style={styles.textInputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder={config.placeholder}
          value={textInput}
          onChangeText={handleTextChange}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#9ca3af"
        />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header with back button and progress */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>

      {/* Question Title */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{config.title}</Text>
      </View>

      {/* Question Content */}
      <View style={styles.contentContainer}>
        {config.type === 'multiple-choice' ? renderMultipleChoice() : renderTextInput()}
      </View>

      {/* Next Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.nextButton, !isNextEnabled() && styles.nextButtonDisabled]}
          onPress={onNext}
          disabled={!isNextEnabled()}
          activeOpacity={0.7}>
          <Text style={[styles.nextButtonText, !isNextEnabled() && styles.nextButtonTextDisabled]}>
            {isLast ? 'Save Goal' : 'Next'}
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  selectedOption: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  selectedOptionText: {
    color: '#1d4ed8',
  },
  textInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    minHeight: 120,
  },
  textInput: {
    padding: 16,
    fontSize: 16,
    color: '#374151',
    minHeight: 120,
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
