import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getMealLogs } from '../../services/mealLogService';
import { MealLog } from '../../types/mealLog';

interface MealHistoryScreenProps {
  onBack: () => void;
}

export const MealHistoryScreen: React.FC<MealHistoryScreenProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getMealLogs(user.uid)
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const formatDate = (timestamp: any): string => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Meal History</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No meals logged yet</Text>
          <Text style={styles.emptySubtext}>Log your first meal to see it here</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id || String(item.timestamp as any)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Text style={styles.placeholderText}>No image</Text>
                </View>
              )}
              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.mealType}>
                    {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}
                  </Text>
                  <Text style={styles.calories}>{item.estimatedCalories} kcal</Text>
                </View>
                <Text style={styles.date}>{formatDate(item.timestamp)}</Text>
                {item.feelingAfterEating ? (
                  <Text style={styles.feeling} numberOfLines={1}>
                    {item.feelingAfterEating}
                  </Text>
                ) : null}
              </View>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#9ca3af' },
  list: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: { width: 80, height: 80 },
  cardImagePlaceholder: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 11, color: '#9ca3af' },
  cardContent: { flex: 1, padding: 12, gap: 4 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealType: { fontSize: 15, fontWeight: '600', color: '#111827' },
  calories: { fontSize: 14, color: '#3b82f6', fontWeight: '600' },
  date: { fontSize: 12, color: '#9ca3af' },
  feeling: { fontSize: 13, color: '#6b7280', fontStyle: 'italic' },
});
