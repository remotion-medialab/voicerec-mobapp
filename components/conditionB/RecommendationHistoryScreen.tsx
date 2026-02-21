import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getRecommendationLogs } from '../../services/recommendationService';
import { RecommendationLog } from '../../types/recommendationLog';

interface RecommendationHistoryScreenProps {
  onBack: () => void;
}

export const RecommendationHistoryScreen: React.FC<RecommendationHistoryScreenProps> = ({
  onBack,
}) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<RecommendationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getRecommendationLogs(user.uid)
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
        <Text style={styles.title}>Recommendation History</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : logs.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No recommendations yet</Text>
          <Text style={styles.emptySubtext}>Plan your first meal to see it here</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id || String(item.timestamp as any)}
          contentContainerStyle={styles.list}
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
                      item.mode === 'cook_at_home' ? styles.modeBadgeTextHome : styles.modeBadgeTextOut,
                    ]}>
                    {item.mode === 'cook_at_home' ? 'Cook at Home' : 'Eat Out'}
                  </Text>
                </View>
                <Text style={styles.date}>{formatDate(item.timestamp)}</Text>
              </View>
              <Text style={styles.recommendationText} numberOfLines={2}>
                {item.recommendationText}
              </Text>
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
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeBadge: {
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  modeBadgeHome: { backgroundColor: '#ecfdf5' },
  modeBadgeOut: { backgroundColor: '#eff6ff' },
  modeBadgeText: { fontSize: 12, fontWeight: '600' },
  modeBadgeTextHome: { color: '#059669' },
  modeBadgeTextOut: { color: '#2563eb' },
  date: { fontSize: 12, color: '#9ca3af' },
  recommendationText: { fontSize: 14, color: '#374151', lineHeight: 20 },
});
