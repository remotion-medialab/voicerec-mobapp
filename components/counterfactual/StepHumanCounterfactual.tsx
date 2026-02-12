import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StepHumanCounterfactualProps {
  value: string;
  isCompleted: boolean;
  onSubmit: (text: string) => void;
}

export const StepHumanCounterfactual: React.FC<StepHumanCounterfactualProps> = ({
  value,
  isCompleted,
  onSubmit,
}) => {
  const [text, setText] = useState(value);

  if (isCompleted) {
    return (
      <View style={styles.completedContainer}>
        <View style={styles.completedHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={styles.completedLabel}>Your Counterfactual</Text>
        </View>
        <Text style={styles.completedText}>{value}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What could you have done differently?</Text>
      <Text style={styles.subtitle}>
        Write one counterfactual — something you could have done differently in this situation.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="I could have..."
        placeholderTextColor="#9ca3af"
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[styles.submitButton, !text.trim() && styles.submitButtonDisabled]}
        onPress={() => onSubmit(text.trim())}
        disabled={!text.trim()}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  completedContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  completedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  completedText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
});
