import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserDietGoal } from '../../services/auth';

const GOAL_OPTIONS = [
  'Lose weight',
  'Maintain weight',
  'Build muscle',
  'Improve energy',
  'Reduce bloating',
  'Other',
];

interface GoalSelectionScreenProps {
  onComplete: () => void;
}

export const GoalSelectionScreen: React.FC<GoalSelectionScreenProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveGoal = selected === 'Other' ? otherText.trim() : selected;
  const canContinue = !!effectiveGoal;

  const handleContinue = async () => {
    if (!user || !effectiveGoal) return;
    setSaving(true);
    try {
      await updateUserDietGoal(user.uid, effectiveGoal);
      await onComplete();
    } catch (err) {
      console.error('Failed to save diet goal:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>What's your main health goal?</Text>
      <Text style={styles.subtitle}>This helps us personalize your experience</Text>

      <View style={styles.optionsContainer}>
        {GOAL_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.card, selected === option && styles.cardSelected]}
            onPress={() => setSelected(option)}
            activeOpacity={0.7}>
            <Text style={[styles.cardText, selected === option && styles.cardTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selected === 'Other' && (
        <TextInput
          style={styles.otherInput}
          placeholder="Describe your goal..."
          value={otherText}
          onChangeText={setOtherText}
          placeholderTextColor="#9ca3af"
          returnKeyType="done"
        />
      )}

      <TouchableOpacity
        style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
        onPress={handleContinue}
        disabled={!canContinue || saving}
        activeOpacity={0.8}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.continueButtonText}>Continue</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 48,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f9fafb',
  },
  cardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  cardText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  cardTextSelected: {
    color: '#2563eb',
  },
  otherInput: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
