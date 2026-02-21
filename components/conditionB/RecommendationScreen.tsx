import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { saveRecommendationLog } from '../../services/recommendationService';
import { MealMode } from '../../types/recommendationLog';
import { RecipeResult } from './CookAtHomeScreen';
import { MenuResult } from './EatOutScreen';

interface RecommendationScreenProps {
  result: RecipeResult | MenuResult;
  mode: MealMode;
  onSave: (recommendationId: string) => void;
  onBack: () => void;
}

function isRecipeResult(result: RecipeResult | MenuResult): result is RecipeResult {
  return 'steps' in result;
}

export const RecommendationScreen: React.FC<RecommendationScreenProps> = ({
  result,
  mode,
  onSave,
  onBack,
}) => {
  const { user, userProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const recipe = isRecipeResult(result);
      const id = await saveRecommendationLog({
        userId: user.uid,
        mode,
        ingredientsText: recipe ? (result as RecipeResult).ingredients : undefined,
        menuImageUrl: !recipe ? (result as MenuResult).menuImageUrl : undefined,
        mealIntention: result.intention,
        linkedGoal: userProfile?.dietGoal || '',
        recommendationText: recipe ? (result as RecipeResult).dish : (result as MenuResult).items.join(', '),
        rationale: result.rationale,
        alternatives: !recipe ? (result as MenuResult).alternatives : undefined,
        timestamp: new Date(),
      });
      onSave(id);
    } catch (err) {
      console.error('Save recommendation error:', err);
      Alert.alert('Error', String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
    }
  };

  const modeLabel = mode === 'cook_at_home' ? 'Cook at Home' : 'Eat Out';
  const recipe = isRecipeResult(result);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.modeBadge}>
        <Text style={styles.modeBadgeText}>{modeLabel}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {recipe ? (result as RecipeResult).dish : (result as MenuResult).items.join(' · ')}
        </Text>

        <Text style={styles.sectionLabel}>Why this works for you</Text>
        <Text style={styles.bodyText}>{result.rationale}</Text>

        {recipe && (result as RecipeResult).steps.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Steps</Text>
            {(result as RecipeResult).steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{i + 1}.</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </>
        )}

        {!recipe && (result as MenuResult).alternatives && (
          <>
            <Text style={styles.sectionLabel}>Alternatives</Text>
            <Text style={styles.bodyText}>{(result as MenuResult).alternatives}</Text>
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save & Log What I Ate</Text>
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
  backButton: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#6b7280' },
  modeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  modeBadgeText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    gap: 12,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  bodyText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  stepRow: { flexDirection: 'row', gap: 8 },
  stepNumber: { fontSize: 14, fontWeight: '700', color: '#3b82f6', minWidth: 20 },
  stepText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: '#93c5fd' },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
