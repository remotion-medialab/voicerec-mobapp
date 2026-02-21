import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { recommendFromIngredients } from '../../services/visionAIService';

export interface RecipeResult {
  dish: string;
  rationale: string;
  steps: string[];
  ingredients: string;
  intention: string;
}

interface CookAtHomeScreenProps {
  onBack: () => void;
  onRecommendation: (result: RecipeResult) => void;
}

const INTENTION_CHIPS = ['Feel energized', 'High protein', 'Lighter meal', 'Comfort food', 'Focus'];

export const CookAtHomeScreen: React.FC<CookAtHomeScreenProps> = ({ onBack, onRecommendation }) => {
  const { userProfile } = useAuth();
  const [ingredients, setIngredients] = useState('');
  const [intention, setIntention] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = ingredients.trim() && intention.trim();

  const handleGetRecommendation = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const result = await recommendFromIngredients(
        ingredients.trim(),
        intention.trim(),
        userProfile?.dietGoal || ''
      );
      onRecommendation({ ...result, ingredients: ingredients.trim(), intention: intention.trim() });
    } catch (err) {
      console.error('CookAtHome recommendation error:', err);
      Alert.alert('Error', String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  };

  const toggleChip = (chip: string) => {
    setIntention(chip === intention ? '' : chip);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Cook at Home</Text>

      <Text style={styles.label}>What ingredients do you have?</Text>
      <TextInput
        style={styles.textArea}
        placeholder="e.g. chicken, rice, broccoli, olive oil..."
        value={ingredients}
        onChangeText={setIngredients}
        multiline
        numberOfLines={4}
        placeholderTextColor="#9ca3af"
        textAlignVertical="top"
      />

      <Text style={styles.label}>What do you want from this meal?</Text>
      <View style={styles.chipsRow}>
        {INTENTION_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[styles.chip, intention === chip && styles.chipSelected]}
            onPress={() => toggleChip(chip)}
            activeOpacity={0.7}>
            <Text style={[styles.chipText, intention === chip && styles.chipTextSelected]}>
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Or describe in your own words..."
        value={intention}
        onChangeText={setIntention}
        placeholderTextColor="#9ca3af"
      />

      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleGetRecommendation}
        disabled={!canSubmit || loading}
        activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Get Recommendation</Text>
        )}
      </TouchableOpacity>
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
  backButton: { marginBottom: 24 },
  backText: { fontSize: 16, color: '#6b7280' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 28 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10 },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
    marginBottom: 24,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#f9fafb',
  },
  chipSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 13, color: '#6b7280' },
  chipTextSelected: { color: '#2563eb', fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 28,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#93c5fd' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
