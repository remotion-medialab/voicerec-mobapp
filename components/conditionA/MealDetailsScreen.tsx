import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { MealType } from '../../types/mealLog';

export interface MealDetailsForm {
  mealType: MealType;
  feelingAfterEating: string;
  bodyResponseAfterEating: string;
}

interface MealDetailsScreenProps {
  imageUri: string;
  estimatedCalories: number;
  onBack: () => void;
  onSave: (details: MealDetailsForm) => void;
}

const MEAL_TYPES: { label: string; value: MealType }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
];

const BODY_CHIPS = ['Energized', 'Satisfied', 'Sluggish', 'Bloated', 'Still hungry'];

export const MealDetailsScreen: React.FC<MealDetailsScreenProps> = ({
  imageUri,
  estimatedCalories,
  onBack,
  onSave,
}) => {
  const [mealType, setMealType] = useState<MealType | null>(null);
  const [feeling, setFeeling] = useState('');
  const [bodyResponse, setBodyResponse] = useState('');

  const handleSave = () => {
    if (!mealType) {
      Alert.alert('Please select a meal type');
      return;
    }
    if (!feeling.trim() && !bodyResponse.trim()) {
      Alert.alert('Please fill in at least one response field');
      return;
    }
    onSave({
      mealType,
      feelingAfterEating: feeling.trim(),
      bodyResponseAfterEating: bodyResponse.trim(),
    });
  };

  const toggleChip = (chip: string) => {
    if (bodyResponse.includes(chip)) {
      setBodyResponse(bodyResponse.replace(chip, '').replace(/, ,/g, ',').replace(/^, |, $/g, '').trim());
    } else {
      setBodyResponse(bodyResponse ? `${bodyResponse}, ${chip}` : chip);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Meal Details</Text>

      <View style={styles.summaryRow}>
        <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.calorieBox}>
          <Text style={styles.calorieValue}>{estimatedCalories}</Text>
          <Text style={styles.calorieLabel}>kcal</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Meal type</Text>
      <View style={styles.mealTypeRow}>
        {MEAL_TYPES.map(({ label, value }) => (
          <TouchableOpacity
            key={value}
            style={[styles.mealChip, mealType === value && styles.mealChipSelected]}
            onPress={() => setMealType(value)}
            activeOpacity={0.7}>
            <Text style={[styles.mealChipText, mealType === value && styles.mealChipTextSelected]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>How did you feel after eating?</Text>
      <TextInput
        style={styles.textArea}
        placeholder="e.g. Light, happy, full..."
        value={feeling}
        onChangeText={setFeeling}
        multiline
        numberOfLines={3}
        placeholderTextColor="#9ca3af"
        textAlignVertical="top"
      />

      <Text style={styles.sectionLabel}>How did your body respond?</Text>
      <View style={styles.chipsRow}>
        {BODY_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[styles.bodyChip, bodyResponse.includes(chip) && styles.bodyChipSelected]}
            onPress={() => toggleChip(chip)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.bodyChipText,
                bodyResponse.includes(chip) && styles.bodyChipTextSelected,
              ]}>
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.textArea}
        placeholder="Or describe in your own words..."
        value={bodyResponse}
        onChangeText={setBodyResponse}
        multiline
        numberOfLines={3}
        placeholderTextColor="#9ca3af"
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} activeOpacity={0.8}>
        <Text style={styles.saveButtonText}>Save Meal</Text>
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
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 24 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  thumbnail: { width: 80, height: 80, borderRadius: 10 },
  calorieBox: { alignItems: 'center' },
  calorieValue: { fontSize: 28, fontWeight: '700', color: '#111827' },
  calorieLabel: { fontSize: 13, color: '#6b7280' },
  sectionLabel: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10 },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  mealChip: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mealChipSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  mealChipText: { fontSize: 14, color: '#374151' },
  mealChipTextSelected: { color: '#2563eb', fontWeight: '600' },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    marginBottom: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  bodyChip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#f9fafb',
  },
  bodyChipSelected: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  bodyChipText: { fontSize: 13, color: '#6b7280' },
  bodyChipTextSelected: { color: '#059669', fontWeight: '600' },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
