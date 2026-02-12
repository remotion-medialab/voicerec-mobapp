import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface StepCompareProps {
  humanCounterfactual: string;
  aiFavoriteTitle: string;
  aiFavoriteText: string;
  aiFavoriteTags: string[];
  editedFavorite: string | null;
  overallPreference: 'human' | 'ai' | null;
  onEditFavorite: (text: string) => void;
  onSetPreference: (pref: 'human' | 'ai') => void;
  onDone: () => void;
}

export const StepCompare: React.FC<StepCompareProps> = ({
  humanCounterfactual,
  aiFavoriteTitle,
  aiFavoriteText,
  aiFavoriteTags,
  editedFavorite,
  overallPreference,
  onEditFavorite,
  onSetPreference,
  onDone,
}) => {
  const [editableText, setEditableText] = useState(editedFavorite || aiFavoriteText);

  const handleDone = () => {
    if (!overallPreference) {
      Alert.alert('Select Preference', 'Please select whether you prefer your counterfactual or the AI one.');
      return;
    }
    onEditFavorite(editableText);
    onDone();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Compare & Edit</Text>
      <Text style={styles.subtitle}>
        Compare your counterfactual with the AI's. You can edit the AI version, then choose which you prefer overall.
      </Text>

      {/* Human counterfactual (read-only) */}
      <View style={styles.comparisonCard}>
        <Text style={styles.cardLabel}>Your Counterfactual</Text>
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>{humanCounterfactual}</Text>
        </View>
      </View>

      {/* AI favorite (editable) */}
      <View style={styles.comparisonCard}>
        <Text style={styles.cardLabelAI}>{aiFavoriteTitle} (editable)</Text>
        <TextInput
          style={styles.editableInput}
          value={editableText}
          onChangeText={(text) => {
            setEditableText(text);
            onEditFavorite(text);
          }}
          multiline
          textAlignVertical="top"
        />
        {aiFavoriteTags && aiFavoriteTags.length > 0 && (
          <View style={styles.tagsContainer}>
            {aiFavoriteTags.map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Preference toggle */}
      <View style={styles.preferenceSection}>
        <Text style={styles.preferenceLabel}>Which do you prefer overall?</Text>
        <View style={styles.preferenceButtons}>
          <TouchableOpacity
            style={[
              styles.prefButton,
              overallPreference === 'human' && styles.prefButtonSelected,
            ]}
            onPress={() => onSetPreference('human')}
          >
            <Text
              style={[
                styles.prefButtonText,
                overallPreference === 'human' && styles.prefButtonTextSelected,
              ]}
            >
              Human
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.prefButton,
              overallPreference === 'ai' && styles.prefButtonSelectedAI,
            ]}
            onPress={() => onSetPreference('ai')}
          >
            <Text
              style={[
                styles.prefButtonText,
                overallPreference === 'ai' && styles.prefButtonTextSelected,
              ]}
            >
              AI
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
        <Text style={styles.doneButtonText}>Done</Text>
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
    marginBottom: 16,
  },
  comparisonCard: {
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  cardLabelAI: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
    marginBottom: 8,
  },
  readOnlyBox: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  editableInput: {
    backgroundColor: '#faf5ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 100,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#7c3aed',
    fontWeight: '500',
  },
  preferenceSection: {
    marginBottom: 20,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  preferenceButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  prefButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  prefButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  prefButtonSelectedAI: {
    borderColor: '#8b5cf6',
    backgroundColor: '#f5f3ff',
  },
  prefButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  prefButtonTextSelected: {
    color: '#1f2937',
  },
  doneButton: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
