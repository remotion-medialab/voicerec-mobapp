import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MealMode } from '../../types/recommendationLog';
import { RecipeResult } from './CookAtHomeScreen';
import { MenuResult } from './EatOutScreen';

interface RecommendationScreenProps {
  result: RecipeResult | MenuResult;
  mode: MealMode;
  onLogNow: () => void;
  onSaveForLater: () => void;
  onBack: () => void;
  saving?: boolean;
}

function isRecipeResult(result: RecipeResult | MenuResult): result is RecipeResult {
  return 'steps' in result;
}

export const RecommendationScreen: React.FC<RecommendationScreenProps> = ({
  result,
  mode,
  onLogNow,
  onSaveForLater,
  onBack,
  saving = false,
}) => {
  const modeLabel = mode === 'cook_at_home' ? 'Cook at Home' : 'Eat Out';
  const recipe = isRecipeResult(result);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton} disabled={saving}>
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
        style={[styles.logNowButton, saving && styles.buttonDisabled]}
        onPress={onLogNow}
        disabled={saving}
        activeOpacity={0.8}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.logNowButtonText}>Log What I Ate Now</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveForLaterButton, saving && styles.buttonDisabled]}
        onPress={onSaveForLater}
        disabled={saving}
        activeOpacity={0.8}>
        {saving ? (
          <ActivityIndicator color="#3b82f6" />
        ) : (
          <Text style={styles.saveForLaterButtonText}>Save for Later</Text>
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodyText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  stepRow: { flexDirection: 'row', gap: 8 },
  stepNumber: { fontSize: 14, fontWeight: '700', color: '#3b82f6', minWidth: 20 },
  stepText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
  logNowButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveForLaterButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  logNowButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  saveForLaterButtonText: { fontSize: 16, fontWeight: '600', color: '#3b82f6' },
});
