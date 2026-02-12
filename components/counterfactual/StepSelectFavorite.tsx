import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AICounterfactual } from '../../types/session';

interface StepSelectFavoriteProps {
  aiCounterfactuals: AICounterfactual[];
  favoriteIndex: number | null;
  isCompleted: boolean;
  onSelect: (index: number) => void;
  onConfirm: () => void;
}

export const StepSelectFavorite: React.FC<StepSelectFavoriteProps> = ({
  aiCounterfactuals,
  favoriteIndex,
  isCompleted,
  onSelect,
  onConfirm,
}) => {
  if (isCompleted && favoriteIndex !== null) {
    return (
      <View style={styles.completedContainer}>
        <View style={styles.completedHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={styles.completedLabel}>Favorite Selected</Text>
        </View>
        <Text style={styles.completedTitle}>
          {aiCounterfactuals[favoriteIndex]?.title}
        </Text>
        <Text style={styles.completedText}>
          {aiCounterfactuals[favoriteIndex]?.text}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Favorite</Text>
      <Text style={styles.subtitle}>
        Which AI counterfactual do you like best?
      </Text>

      {aiCounterfactuals.map((cf, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.optionCard,
            favoriteIndex === index && styles.optionCardSelected,
          ]}
          onPress={() => onSelect(index)}
        >
          <View style={styles.radioOuter}>
            {favoriteIndex === index && <View style={styles.radioInner} />}
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>{cf.title || `Counterfactual ${index + 1}`}</Text>
            <Text style={styles.optionText}>{cf.text}</Text>
            {cf.tags && cf.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {cf.tags.map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.confirmButton, favoriteIndex === null && styles.confirmButtonDisabled]}
        onPress={onConfirm}
        disabled={favoriteIndex === null}
      >
        <Text style={styles.confirmButtonText}>Confirm Selection</Text>
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
  optionCard: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 12,
  },
  optionCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8b5cf6',
    marginBottom: 4,
  },
  optionText: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
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
  confirmButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  confirmButtonText: {
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
  completedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  completedText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
});
