import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MealLoggedScreenProps {
  calories: number;
  mealType: string;
  onDone: () => void;
  onReflect?: () => void;
}

export const MealLoggedScreen: React.FC<MealLoggedScreenProps> = ({
  calories,
  mealType,
  onDone,
  onReflect,
}) => {
  const mealTypeLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  return (
    <View style={styles.container}>
      <View style={styles.checkCircle}>
        <Text style={styles.checkMark}>✓</Text>
      </View>

      <Text style={styles.title}>Meal Logged!</Text>
      <Text style={styles.subtitle}>Great job tracking your meal</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Meal Type</Text>
          <Text style={styles.summaryValue}>{mealTypeLabel}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Estimated Calories</Text>
          <Text style={styles.summaryValue}>{calories} kcal</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.doneButton} onPress={onDone} activeOpacity={0.8}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>

      {onReflect && (
        <View style={styles.reflectSection}>
          <TouchableOpacity style={styles.reflectButton} onPress={onReflect} activeOpacity={0.8}>
            <Text style={styles.reflectButtonText}>Let's Reflect</Text>
          </TouchableOpacity>
          <Text style={styles.reflectHint}>Optional voice check-in</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  checkMark: { fontSize: 40, color: '#fff', fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6b7280', marginBottom: 40 },
  summaryCard: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: { fontSize: 14, color: '#6b7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#e5e7eb' },
  doneButton: {
    width: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  doneButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  reflectSection: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  reflectButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  reflectButtonText: { fontSize: 16, fontWeight: '500', color: '#6b7280' },
  reflectHint: { fontSize: 12, color: '#9ca3af' },
});
