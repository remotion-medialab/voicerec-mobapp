import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AICounterfactual } from '../../types/session';

interface StepGenerateAIProps {
  aiCounterfactuals: AICounterfactual[];
  previousGenerations: AICounterfactual[][];
  isCompleted: boolean;
  onGenerate: () => Promise<void>;
  onContinue: () => void;
}

export const StepGenerateAI: React.FC<StepGenerateAIProps> = ({
  aiCounterfactuals,
  previousGenerations,
  isCompleted,
  onGenerate,
  onContinue,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);

  const hasResults = aiCounterfactuals.length > 0;
  const hasPrevious = previousGenerations.length > 0;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      await onGenerate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate counterfactuals');
    } finally {
      setLoading(false);
    }
  };

  const renderTags = (tags: string[]) => {
    if (!tags || tags.length === 0) return null;
    return (
      <View style={styles.tagsContainer}>
        {tags.map((tag, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (isCompleted) {
    return (
      <View style={styles.completedContainer}>
        <View style={styles.completedHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={styles.completedLabel}>AI Counterfactuals Generated</Text>
        </View>
        {aiCounterfactuals.map((cf, index) => (
          <View key={index} style={styles.completedCard}>
            <Text style={styles.completedTitle}>{cf.title}</Text>
            <Text style={styles.completedText}>{cf.text}</Text>
            {renderTags(cf.tags)}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Counterfactuals</Text>
      <Text style={styles.subtitle}>
        Generate AI-suggested counterfactuals to compare with yours.
      </Text>

      {!hasResults && !loading && (
        <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
          <Ionicons name="sparkles" size={20} color="#ffffff" />
          <Text style={styles.generateButtonText}>Generate AI Counterfactuals</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Generating counterfactuals...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleGenerate}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {hasResults && !loading && (
        <>
          {aiCounterfactuals.map((cf, index) => (
            <View key={index} style={styles.aiCard}>
              <View style={styles.aiCardHeader}>
                <Text style={styles.aiCardNumber}>{index + 1}</Text>
                <Text style={styles.aiCardTitle}>{cf.title}</Text>
              </View>
              <Text style={styles.aiCardText}>{cf.text}</Text>
              {renderTags(cf.tags)}
            </View>
          ))}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.regenerateButton} onPress={handleGenerate}>
              <Ionicons name="refresh" size={18} color="#8b5cf6" />
              <Text style={styles.regenerateButtonText}>Regenerate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
              <Text style={styles.continueButtonText}>Continue to Rating</Text>
            </TouchableOpacity>
          </View>

          {/* Previous generations toggle */}
          {hasPrevious && (
            <View style={styles.previousSection}>
              <TouchableOpacity
                style={styles.previousToggle}
                onPress={() => setShowPrevious(!showPrevious)}
              >
                <Ionicons
                  name={showPrevious ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#6b7280"
                />
                <Text style={styles.previousToggleText}>
                  {previousGenerations.length} previous generation{previousGenerations.length > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>

              {showPrevious && previousGenerations.map((gen, genIndex) => (
                <View key={genIndex} style={styles.previousGeneration}>
                  <Text style={styles.previousGenLabel}>Generation {genIndex + 1}</Text>
                  {gen.map((cf, cfIndex) => (
                    <View key={cfIndex} style={styles.previousCard}>
                      <Text style={styles.previousCardTitle}>{cf.title}</Text>
                      <Text style={styles.previousCardText}>{cf.text}</Text>
                      {renderTags(cf.tags)}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </>
      )}
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
  generateButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  aiCard: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiCardNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  aiCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  aiCardText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  regenerateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  previousSection: {
    marginTop: 16,
  },
  previousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  previousToggleText: {
    fontSize: 13,
    color: '#6b7280',
  },
  previousGeneration: {
    marginTop: 8,
    marginBottom: 12,
  },
  previousGenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previousCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  previousCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  previousCardText: {
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 20,
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
  completedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  completedText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
});
