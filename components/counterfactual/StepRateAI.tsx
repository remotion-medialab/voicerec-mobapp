import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AICounterfactual, CounterfactualRating, RATING_QUALITIES } from '../../types/session';
import { StarRating } from './StarRating';

interface StepRateAIProps {
  aiCounterfactuals: AICounterfactual[];
  isCompleted: boolean;
  onRate: (index: number, quality: keyof CounterfactualRating, value: number) => void;
  onSubmit: () => void;
}

export const StepRateAI: React.FC<StepRateAIProps> = ({
  aiCounterfactuals,
  isCompleted,
  onRate,
  onSubmit,
}) => {
  // Check if all 12 ratings (3 counterfactuals x 4 qualities) are filled
  const allRated = aiCounterfactuals.every((cf) => {
    if (!cf.rating) return false;
    return RATING_QUALITIES.every((q) => cf.rating![q.key] > 0);
  });

  if (isCompleted) {
    return (
      <View style={styles.completedContainer}>
        <View style={styles.completedHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={styles.completedLabel}>Ratings Submitted</Text>
        </View>
        {aiCounterfactuals.map((cf, index) => (
          <View key={index} style={styles.completedCard}>
            <Text style={styles.completedCardTitle}>{cf.title || `Counterfactual ${index + 1}`}</Text>
            {cf.rating && RATING_QUALITIES.map((q) => (
              <Text key={q.key} style={styles.completedRating}>
                {q.label}: {'★'.repeat(cf.rating![q.key])}{'☆'.repeat(5 - cf.rating![q.key])}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rate AI Counterfactuals</Text>
      <Text style={styles.subtitle}>
        Rate each AI counterfactual on 4 qualities (1-5 stars).
      </Text>

      {aiCounterfactuals.map((cf, cfIndex) => (
        <View key={cfIndex} style={styles.rateCard}>
          <Text style={styles.rateCardTitle}>{cf.title || `Counterfactual ${cfIndex + 1}`}</Text>
          <Text style={styles.rateCardText}>{cf.text}</Text>
          {cf.tags && cf.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {cf.tags.map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {RATING_QUALITIES.map((quality) => (
            <View key={quality.key} style={styles.ratingRow}>
              <View style={styles.ratingLabel}>
                <Text style={styles.ratingLabelText}>{quality.label}</Text>
                <Text style={styles.ratingDescription}>{quality.description}</Text>
              </View>
              <StarRating
                rating={cf.rating?.[quality.key] || 0}
                onRate={(value) => onRate(cfIndex, quality.key, value)}
                size={24}
              />
            </View>
          ))}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.submitButton, !allRated && styles.submitButtonDisabled]}
        onPress={onSubmit}
        disabled={!allRated}
      >
        <Text style={styles.submitButtonText}>
          {allRated ? 'Submit Ratings' : 'Rate all qualities to continue'}
        </Text>
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
  rateCard: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  rateCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8b5cf6',
    marginBottom: 8,
  },
  rateCardText: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 22,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
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
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingLabel: {
    flex: 1,
    marginRight: 8,
  },
  ratingLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  ratingDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
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
    marginBottom: 12,
  },
  completedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  completedCard: {
    marginBottom: 8,
  },
  completedCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  completedRating: {
    fontSize: 12,
    color: '#6b7280',
  },
});
