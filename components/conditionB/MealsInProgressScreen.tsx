import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getMealSessions } from '../../services/mealSessionService';
import { MealSession } from '../../types/mealSession';

interface MealsInProgressScreenProps {
  onBack: () => void;
  onResume: (session: MealSession) => void;
}

function timeAgo(date: any): string {
  const d = date?.toDate ? date.toDate() : new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

export const MealsInProgressScreen: React.FC<MealsInProgressScreenProps> = ({
  onBack,
  onResume,
}) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MealSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      const all = await getMealSessions(user.uid);
      setSessions(
        all.filter(
          (s) => s.status === 'awaiting_post_meal_log' || s.status === 'awaiting_reflection'
        )
      );
    } catch (err) {
      console.error('Failed to load in-progress meals:', err);
    }
  }, [user]);

  useEffect(() => {
    loadSessions().finally(() => setLoading(false));
  }, [loadSessions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Meals in Progress</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No meals in progress</Text>
          <Text style={styles.emptySubtext}>
            Plan a meal and save it for later to see it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id || item.createdAt.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#3b82f6" />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.modeBadge,
                    item.mode === 'cook_at_home' ? styles.modeBadgeHome : styles.modeBadgeOut,
                  ]}>
                  <Text
                    style={[
                      styles.modeBadgeText,
                      item.mode === 'cook_at_home'
                        ? styles.modeBadgeTextHome
                        : styles.modeBadgeTextOut,
                    ]}>
                    {item.mode === 'cook_at_home' ? 'Cook at Home' : 'Eat Out'}
                  </Text>
                </View>
                <Text style={styles.timeAgo}>{timeAgo(item.createdAt)}</Text>
              </View>

              <Text style={styles.recommendationText} numberOfLines={2}>
                {item.recommendationText}
              </Text>

              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => onResume(item)}
                activeOpacity={0.8}>
                <Text style={styles.resumeButtonText}>
                  {item.status === 'awaiting_reflection' ? 'Complete Reflection' : 'Resume'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 8,
  },
  backText: { fontSize: 16, color: '#6b7280' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  list: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeBadge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10 },
  modeBadgeHome: { backgroundColor: '#ecfdf5' },
  modeBadgeOut: { backgroundColor: '#eff6ff' },
  modeBadgeText: { fontSize: 12, fontWeight: '600' },
  modeBadgeTextHome: { color: '#059669' },
  modeBadgeTextOut: { color: '#2563eb' },
  timeAgo: { fontSize: 12, color: '#9ca3af' },
  recommendationText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  resumeButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resumeButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
