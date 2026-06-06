import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../ui';
import { MONTHS, WEEKDAY_LETTERS, monthMatrix } from './dateUtils';
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

  return (
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
                    onPress={() => has && onOpenMeal(dayMeals![0])}
                    className="items-center justify-center"
                    style={{ flex: 1, aspectRatio: 1, margin: 2 }}>
                    {day ? (
                      <View
                        className="h-full w-full items-center justify-center overflow-hidden"
                        style={{
                          borderRadius: 12,
                          backgroundColor: has ? colors.primary : 'transparent',
                        }}>
                        {photo ? (
                          <Image
                            source={{ uri: photo }}
                            style={{ position: 'absolute', width: '100%', height: '100%' }}
                          />
                        ) : null}
                        {/* Darken photo so the day number stays legible. */}
                        {photo ? (
                          <View
                            style={{
                              position: 'absolute',
                              width: '100%',
                              height: '100%',
                              backgroundColor: 'rgba(0,0,0,0.28)',
                            }}
                          />
                        ) : null}
                        <Text
                          style={{
                            color: has ? colors.white : colors.inkSoft,
                            fontWeight: has ? '700' : '500',
                            fontSize: 14,
                          }}>
                          {day}
                        </Text>
                        {has && dayMeals!.length > 1 ? (
                          <Text style={{ color: colors.white, fontSize: 9, opacity: 0.9 }}>
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
  );
};

const RoundBtn: React.FC<{ icon: any; onPress: () => void }> = ({ icon, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    className="h-10 w-10 items-center justify-center rounded-full"
    style={{ backgroundColor: colors.field }}>
    <Ionicons name={icon} size={18} color={colors.inkSoft} />
  </TouchableOpacity>
);
