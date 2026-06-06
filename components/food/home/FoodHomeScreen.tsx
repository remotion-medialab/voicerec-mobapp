import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FoodEntryCard } from './FoodEntryCard';
import { useFood } from '../../../contexts/FoodContext';
import { FoodEntry } from '../../../types/food';
import { Timestamp } from 'firebase/firestore';

interface Props {
  onAddMeal: () => void;
  onEntryPress: (entry: FoodEntry) => void;
}

function isToday(ts: Timestamp): boolean {
  const d = ts.toDate();
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

function isYesterday(ts: Timestamp): boolean {
  const d = ts.toDate();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

export function FoodHomeScreen({ onAddMeal, onEntryPress }: Props) {
  const { entries, loading, refreshEntries } = useFood();
  const [refreshing, setRefreshing] = useState(false);

  const todayEntries = entries.filter((e) => isToday(e.date));
  const yesterdayEntries = entries.filter((e) => isYesterday(e.date));

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshEntries();
    setRefreshing(false);
  };

  const todayCalories = todayEntries.reduce((sum, e) => sum + (e.calories ?? 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>This week</Text>
          {todayCalories > 0 && (
            <Text style={styles.headerSub}>{todayCalories} kcal today</Text>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={onAddMeal} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}>
        {/* Today */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Today</Text>
          {todayEntries.length === 0 ? (
            <TouchableOpacity style={styles.emptyCard} onPress={onAddMeal} activeOpacity={0.8}>
              <Ionicons name="restaurant-outline" size={28} color="#c7d2fe" />
              <Text style={styles.emptyText}>Log your first meal</Text>
              <Text style={styles.emptyHint}>Tap to get started</Text>
            </TouchableOpacity>
          ) : (
            todayEntries.map((entry) => (
              <FoodEntryCard key={entry.id} entry={entry} onPress={onEntryPress} />
            ))
          )}
        </View>

        {/* Yesterday */}
        {yesterdayEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Yesterday</Text>
            {yesterdayEntries.map((entry) => (
              <FoodEntryCard key={entry.id} entry={entry} onPress={onEntryPress} />
            ))}
          </View>
        )}

        {/* Older entries summary */}
        {entries.filter((e) => !isToday(e.date) && !isYesterday(e.date)).length > 0 && (
          <View style={styles.olderHint}>
            <Text style={styles.olderText}>
              {entries.filter((e) => !isToday(e.date) && !isYesterday(e.date)).length} earlier
              entries
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#334155', marginTop: 12 },
  emptyHint: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  olderHint: { alignItems: 'center', paddingVertical: 8 },
  olderText: { fontSize: 13, color: '#94a3b8' },
});
