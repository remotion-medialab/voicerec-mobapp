import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../ui';
import { MealCard } from './MealCard';
import { groupByDay } from './dateUtils';
import { listMeals } from '../../services/meals';
import { logOut } from '../../services/auth';
import { MealRecord } from '../../types/meal';

interface FeedScreenProps {
  onOpenMeal: (meal: MealRecord) => void;
}

/** "This week" feed — meals grouped by day, newest first. */
export const FeedScreen: React.FC<FeedScreenProps> = ({ onOpenMeal }) => {
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setMeals(await listMeals());
    } catch (e) {
      console.error('Failed to load meals:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const groups = groupByDay(meals, (m) => m.timestamp);

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }>
      {/* Header */}
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text style={{ color: colors.kicker, fontSize: 11, letterSpacing: 2 }}>
            MY FOOD JOURNAL
          </Text>
          <Text style={{ color: colors.ink, fontSize: 32, fontWeight: '900', marginTop: 2 }}>
            This week
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => logOut().catch((e) => console.error('Logout failed:', e))}
          activeOpacity={0.8}
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.field }}>
          <Ionicons name="log-out-outline" size={18} color={colors.inkSoft} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="mt-32 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : meals.length === 0 ? (
        <EmptyState />
      ) : (
        groups.map((group) => (
          <View key={group.label} className="mb-6">
            <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 10 }}>
              {group.label}
            </Text>
            <View style={{ gap: 10 }}>
              {group.items.map((m) => (
                <MealCard key={m.meal_id} meal={m} onPress={() => onOpenMeal(m)} />
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const EmptyState: React.FC = () => (
  <View className="mt-28 items-center px-8">
    <View
      className="mb-5 items-center justify-center rounded-full"
      style={{ width: 88, height: 88, backgroundColor: colors.field }}>
      <Ionicons name="restaurant-outline" size={36} color={colors.primary} />
    </View>
    <Text style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>No meals yet</Text>
    <Text
      style={{
        color: colors.subtle,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 20,
      }}>
      Tap the + button to log your first meal and start learning how your body responds.
    </Text>
  </View>
);
