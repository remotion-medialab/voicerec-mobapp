import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../ui';
import { MONTHS, WEEKDAY_LETTERS, monthMatrix } from './dateUtils';
import { MealTile } from './MealTile';
import { listMeals } from '../../services/meals';
import { MealRecord } from '../../types/meal';

interface CalendarScreenProps {
  onOpenMeal: (meal: MealRecord) => void;
}

/** Month calendar — days with logged meals are marked; tap to open the latest. */
export const CalendarScreen: React.FC<CalendarScreenProps> = ({ onOpenMeal }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  // Day-of-month whose meals are shown in the detail sheet (null = closed).
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setMeals(await listMeals());
      } catch (e) {
        console.error('Failed to load meals:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Map day-of-month → meals on that day for the current month/year.
  const byDay = useMemo(() => {
    const map = new Map<number, MealRecord[]>();
    for (const m of meals) {
      const d = m.timestamp;
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), m]);
      }
    }
    return map;
  }, [meals, year, month]);

  const rows = monthMatrix(year, month);

  const shift = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };

  const selectedMeals = selectedDay != null ? byDay.get(selectedDay) ?? [] : [];

  return (
    <>
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
      {/* Header */}
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text style={{ color: colors.kicker, fontSize: 11, letterSpacing: 2 }}>
            {String(year)}
          </Text>
          <Text style={{ color: colors.ink, fontSize: 32, fontWeight: '900', marginTop: 2 }}>
            {MONTHS[month]}
          </Text>
        </View>
        <View className="flex-row" style={{ gap: 8 }}>
          <RoundBtn icon="chevron-back" onPress={() => shift(-1)} />
          <RoundBtn icon="chevron-forward" onPress={() => shift(1)} />
        </View>
      </View>

      {/* Weekday header */}
      <View className="flex-row">
        {WEEKDAY_LETTERS.map((w, i) => (
          <Text
            key={i}
            style={{
              flex: 1,
              textAlign: 'center',
              color: colors.kicker,
              fontSize: 12,
              fontWeight: '600',
            }}>
            {w}
          </Text>
        ))}
      </View>

      {loading ? (
        <View className="mt-24 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View className="mt-2">
          {rows.map((row, ri) => (
            <View key={ri} className="flex-row" style={{ marginBottom: 6 }}>
              {row.map((day, ci) => {
                const dayMeals = day ? byDay.get(day) : undefined;
                const has = !!dayMeals?.length;
                const photo = dayMeals?.find((m) => m.photo_url)?.photo_url;
                return (
                  <TouchableOpacity
                    key={ci}
                    disabled={!has}
                    activeOpacity={0.8}
                    onPress={() => has && day && setSelectedDay(day)}
                    style={{ flex: 1, aspectRatio: 3 / 4, margin: 2 }}>
                    {day ? (
                      <View
                        className="h-full w-full overflow-hidden"
                        style={{
                          borderRadius: 12,
                          backgroundColor: has ? colors.primary : 'transparent',
                        }}>
                        {photo ? (
                          <Image
                            source={{ uri: photo }}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                          />
                        ) : null}
                        {/* Darken photo so the day number stays legible. */}
                        {photo ? (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(0,0,0,0.28)',
                            }}
                          />
                        ) : null}
                        <Text
                          style={{
                            position: 'absolute',
                            top: 6,
                            left: 6,
                            color: has ? colors.white : colors.inkSoft,
                            fontWeight: has ? '700' : '500',
                            fontSize: 14,
                          }}>
                          {day}
                        </Text>
                        {has && dayMeals!.length > 1 ? (
                          <Text
                            style={{
                              position: 'absolute',
                              bottom: 6,
                              left: 6,
                              color: colors.white,
                              fontSize: 9,
                              opacity: 0.9,
                            }}>
                            {dayMeals!.length} meals
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </ScrollView>

    <DayDetailSheet
      title={
        selectedDay != null
          ? new Date(year, month, selectedDay).toLocaleDateString([], {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })
          : ''
      }
      meals={selectedMeals}
      onClose={() => setSelectedDay(null)}
      onOpenMeal={(m) => {
        setSelectedDay(null);
        onOpenMeal(m);
      }}
    />
    </>
  );
};

/** Bottom sheet listing every meal logged on the tapped day. */
const DayDetailSheet: React.FC<{
  title: string;
  meals: MealRecord[];
  onClose: () => void;
  onOpenMeal: (m: MealRecord) => void;
}> = ({ title, meals, onClose, onOpenMeal }) => (
  <Modal
    visible={meals.length > 0}
    transparent
    animationType="slide"
    onRequestClose={onClose}>
    <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      {/* Tap the backdrop above the sheet to dismiss. */}
      <TouchableOpacity className="flex-1" activeOpacity={1} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.white,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: '75%',
        }}>
        <SafeAreaView edges={['bottom']}>
          <View className="flex-row items-center justify-between" style={{ padding: 20, paddingBottom: 12 }}>
            <View>
              <Text style={{ color: colors.kicker, fontSize: 11, letterSpacing: 2 }}>
                {meals.length} {meals.length === 1 ? 'MEAL' : 'MEALS'}
              </Text>
              <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 2 }}>
                {title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.field }}>
              <Ionicons name="close" size={20} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
              {meals.map((m) => (
                <View key={m.meal_id} style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}>
                  <MealTile meal={m} onPress={() => onOpenMeal(m)} />
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  </Modal>
);

const RoundBtn: React.FC<{ icon: any; onPress: () => void }> = ({ icon, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    className="h-10 w-10 items-center justify-center rounded-full"
    style={{ backgroundColor: colors.field }}>
    <Ionicons name={icon} size={18} color={colors.inkSoft} />
  </TouchableOpacity>
);
