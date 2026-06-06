import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { FoodEntry } from '../../../types/food';

interface Props {
  entry: FoodEntry;
  onPress: (entry: FoodEntry) => void;
}

function formatTime(ts: any): string {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function FoodEntryCard({ entry, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(entry)} activeOpacity={0.8}>
      <View style={styles.left}>
        {entry.photoUrl ? (
          <Image source={{ uri: entry.photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoEmoji}>🍽️</Text>
          </View>
        )}
      </View>

      <View style={styles.middle}>
        <Text style={styles.foodName} numberOfLines={1}>
          {entry.foodName}
        </Text>
        <Text style={styles.mealType}>{MEAL_LABELS[entry.mealType] ?? entry.mealType}</Text>
        <Text style={styles.time}>{formatTime(entry.date)}</Text>
      </View>

      <View style={styles.right}>
        {entry.calories ? (
          <View style={styles.calBadge}>
            <Text style={styles.calText}>{entry.calories}</Text>
            <Text style={styles.calUnit}>kcal</Text>
          </View>
        ) : null}
        <View style={[styles.moodDot, { backgroundColor: moodColor(entry.moodRating) }]} />
      </View>
    </TouchableOpacity>
  );
}

function moodColor(rating: number): string {
  if (rating >= 5) return '#22c55e';
  if (rating >= 3) return '#f59e0b';
  return '#ef4444';
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  left: { marginRight: 12 },
  photo: { width: 64, height: 64, borderRadius: 12 },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmoji: { fontSize: 28 },
  middle: { flex: 1 },
  foodName: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  mealType: { fontSize: 13, color: '#6366f1', fontWeight: '500', marginBottom: 2 },
  time: { fontSize: 12, color: '#94a3b8' },
  right: { alignItems: 'flex-end', gap: 6 },
  calBadge: { alignItems: 'center' },
  calText: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  calUnit: { fontSize: 11, color: '#94a3b8' },
  moodDot: { width: 10, height: 10, borderRadius: 5 },
});
