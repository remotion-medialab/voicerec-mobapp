import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../ui';
import { MealTile } from './MealTile';
import { groupByDay } from './dateUtils';
import { listMeals } from '../../services/meals';
import { logOut } from '../../services/auth';
import { MealRecord } from '../../types/meal';

interface FeedScreenProps {
  onOpenMeal: (meal: MealRecord) => void;
}

type DayGroup = { label: string; items: MealRecord[] };

const H_PADDING = 20;
const CARD_GAP = 12;

/**
 * "This week" feed — days are stacked vertically (newest first); within each
 * day the meals are a horizontal carousel you swipe left/right through, one
 * meal at a time, instead of a single long vertical list.
 */
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
      contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }>
      {/* Header */}
      <View
        className="mb-5 flex-row items-start justify-between"
        style={{ paddingHorizontal: H_PADDING }}>
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
          <DayRow key={group.label} group={group} onOpenMeal={onOpenMeal} />
        ))
      )}
    </ScrollView>
  );
};

/** One day: a label, then a horizontal, meal-by-meal snapping carousel. */
const DayRow: React.FC<{ group: DayGroup; onOpenMeal: (m: MealRecord) => void }> = ({
  group,
  onOpenMeal,
}) => {
  const { width } = useWindowDimensions();
  // Portrait tiles sized so ~2.2 show at once (like the reference), with the
  // next one peeking to signal the row scrolls sideways. Snap by one tile + gap
  // so a swipe lands on one meal at a time.
  const cardWidth = Math.round((width - H_PADDING * 2 - CARD_GAP) / 2.2);
  const snap = cardWidth + CARD_GAP;

  return (
    <View className="mb-6">
      <View
        className="mb-2.5 flex-row items-end justify-between"
        style={{ paddingHorizontal: H_PADDING }}>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>{group.label}</Text>
        <Text style={{ color: colors.subtle, fontSize: 12 }}>
          {group.items.length} {group.items.length === 1 ? 'meal' : 'meals'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={snap}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: H_PADDING, gap: CARD_GAP }}>
        {group.items.map((m) => (
          <View key={m.meal_id} style={{ width: cardWidth }}>
            <MealTile meal={m} onPress={() => onOpenMeal(m)} />
          </View>
        ))}
      </ScrollView>
    </View>
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
