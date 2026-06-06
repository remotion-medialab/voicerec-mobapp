import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FoodEntry } from '../../../types/food';

interface Props {
  entry: FoodEntry;
  onBack: () => void;
  onEdit: (entry: FoodEntry) => void;
}

function formatDate(ts: any): string {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
};

export function EntryDetailScreen({ entry, onBack, onEdit }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{MEAL_LABELS[entry.mealType]}</Text>
        <TouchableOpacity onPress={() => onEdit(entry)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="pencil" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {entry.photoUrl ? (
          <Image source={{ uri: entry.photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoEmoji}>🍽️</Text>
          </View>
        )}

        <Text style={styles.foodName}>{entry.foodName}</Text>
        <Text style={styles.date}>{formatDate(entry.date)}</Text>

        <View style={styles.statsRow}>
          {entry.calories ? (
            <View style={styles.statBadge}>
              <Text style={styles.statValue}>{entry.calories}</Text>
              <Text style={styles.statLabel}>kcal</Text>
            </View>
          ) : null}
          <View style={styles.statBadge}>
            <Text style={styles.statValue}>{entry.moodRating}/6</Text>
            <Text style={styles.statLabel}>mood</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statValue}>{entry.howClose}%</Text>
            <Text style={styles.statLabel}>match</Text>
          </View>
          <View style={styles.statBadge}>
            <Text style={styles.statValue}>{entry.bodyFeeling}%</Text>
            <Text style={styles.statLabel}>body</Text>
          </View>
        </View>

        {/* Taste profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taste profile</Text>
          {Object.entries(entry.tasteProfile).map(([key, val]) =>
            val > 0 ? (
              <View key={key} style={styles.tasteRow}>
                <Text style={styles.tasteLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                <View style={styles.tasteBar}>
                  <View style={[styles.tasteFill, { width: `${(val / 4) * 100}%` }]} />
                </View>
              </View>
            ) : null
          )}
        </View>

        {/* Reflection */}
        {entry.reflectionText ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reflection</Text>
            <Text style={styles.reflectionText}>{entry.reflectionText}</Text>
          </View>
        ) : null}

        {/* AI insight */}
        {entry.aiCompanionSummary ? (
          <View style={styles.aiCard}>
            <Ionicons name="sparkles" size={16} color="#6366f1" style={{ marginBottom: 6 }} />
            <Text style={styles.aiText}>{entry.aiCompanionSummary}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  photo: { width: '100%', height: 240, borderRadius: 20, marginBottom: 16 },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  photoEmoji: { fontSize: 48 },
  foodName: { fontSize: 26, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  date: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statBadge: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  tasteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  tasteLabel: { fontSize: 14, color: '#0f172a', width: 64 },
  tasteBar: { flex: 1, height: 6, backgroundColor: '#e2e8f0', borderRadius: 3 },
  tasteFill: { height: 6, backgroundColor: '#6366f1', borderRadius: 3 },
  reflectionText: { fontSize: 15, color: '#334155', lineHeight: 22 },
  aiCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  aiText: { fontSize: 14, color: '#4338ca', lineHeight: 20 },
});
