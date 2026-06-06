import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../ui';
import { timeLabel } from './dateUtils';
import { MealRecord } from '../../types/meal';

interface MealCardProps {
  meal: MealRecord;
  onPress: () => void;
}

/** mm:ss (or h:mm:ss) remaining until `due`, or null once elapsed. */
function countdown(due: Date, now: number): string | null {
  const ms = due.getTime() - now;
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Feed card: thumbnail + name, with a status-aware right column (outcome, "rate it", or live body-response countdown). */
export const MealCard: React.FC<MealCardProps> = ({ meal, onPress }) => {
  const awaitingBody = meal.status === 'awaiting_body' && !!meal.body_due_at;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!awaitingBody) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [awaitingBody]);

  const remaining = awaitingBody ? countdown(meal.body_due_at!, now) : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="flex-row items-center"
      style={{
        backgroundColor: colors.white,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 12,
        gap: 12,
      }}>
      <View
        className="items-center justify-center overflow-hidden"
        style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.field }}>
        {meal.photo_url ? (
          <Image source={{ uri: meal.photo_url }} style={{ width: 56, height: 56 }} />
        ) : (
          <Text style={{ fontSize: 26 }}>🍜</Text>
        )}
      </View>

      <View className="flex-1">
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
          {meal.meal_text}
        </Text>
        <Text style={{ color: colors.kicker, fontSize: 12, marginTop: 2 }}>
          {timeLabel(meal.timestamp)}
          {statusSubtitle(meal, remaining)}
        </Text>
      </View>

      <RightColumn meal={meal} remaining={remaining} awaitingBody={awaitingBody} />
    </TouchableOpacity>
  );
};

function statusSubtitle(meal: MealRecord, remaining: string | null): string {
  if (meal.status === 'awaiting_reaction') return ' · tap to rate';
  if (meal.status === 'awaiting_body') return remaining ? ' · body response' : ' · check-in ready';
  const portion = meal.actual?.portion_eaten;
  return portion ? ` · ate ${portion}` : '';
}

const RightColumn: React.FC<{
  meal: MealRecord;
  remaining: string | null;
  awaitingBody: boolean;
}> = ({ meal, remaining, awaitingBody }) => {
  if (awaitingBody) {
    // Live countdown to the +30 min body check-in (or "Ready" once elapsed).
    return remaining ? (
      <View className="items-end" style={{ paddingRight: 2 }}>
        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 18 }}>{remaining}</Text>
        <Text style={{ color: colors.kicker, fontSize: 9, letterSpacing: 1 }}>TILL CHECK-IN</Text>
      </View>
    ) : (
      <View
        className="flex-row items-center"
        style={{
          backgroundColor: colors.primary,
          borderRadius: 999,
          paddingVertical: 6,
          paddingHorizontal: 12,
          gap: 6,
        }}>
        <Ionicons name="notifications" size={13} color={colors.white} />
        <Text style={{ color: colors.white, fontSize: 12, fontWeight: '700' }}>Log now</Text>
      </View>
    );
  }

  if (meal.status === 'awaiting_reaction') {
    return (
      <View
        className="flex-row items-center"
        style={{
          borderColor: colors.primary,
          borderWidth: 1,
          borderRadius: 999,
          paddingVertical: 6,
          paddingHorizontal: 12,
          gap: 6,
        }}>
        <Ionicons name="restaurant" size={13} color={colors.primary} />
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>Rate</Text>
      </View>
    );
  }

  const fullness = meal.actual?.actual_fullness;
  return fullness != null ? (
    <View className="items-end" style={{ paddingRight: 4 }}>
      <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18 }}>
        {fullness}
        <Text style={{ color: colors.kicker, fontSize: 11 }}>/10</Text>
      </Text>
      <Text style={{ color: colors.kicker, fontSize: 10, letterSpacing: 1 }}>FULL</Text>
    </View>
  ) : (
    <Ionicons name="chevron-forward" size={18} color={colors.kicker} />
  );
};
