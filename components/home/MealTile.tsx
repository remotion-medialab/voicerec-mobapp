import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../ui';
import { timeLabel } from './dateUtils';
import { MealRecord } from '../../types/meal';

/** Tiles render their photo at a 3:4 (portrait) aspect ratio. */
const TILE_ASPECT = 3 / 4;

interface MealTileProps {
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

/**
 * Photo-forward meal tile used in the weekly carousel. A food photo (or emoji
 * placeholder) fills the tile, with a status pill up top and the meal name
 * overlaid at the bottom. Meals still counting down to their body check-in get
 * a distinct primary-colored CTA tile instead.
 */
export const MealTile: React.FC<MealTileProps> = ({ meal, onPress }) => {
  const awaitingBody = meal.status === 'awaiting_body' && !!meal.body_due_at;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!awaitingBody) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [awaitingBody]);

  const remaining = awaitingBody ? countdown(meal.body_due_at!, now) : null;

  // Counting down → a solid CTA tile prompting the body-response check-in.
  if (remaining) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{
          aspectRatio: TILE_ASPECT,
          borderRadius: 20,
          backgroundColor: colors.primary,
          padding: 16,
          justifyContent: 'space-between',
        }}>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Ionicons name="time-outline" size={15} color={colors.white} />
          <Text style={{ color: colors.white, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>
            BODY RESPONSE
          </Text>
        </View>
        <View>
          <Text style={{ color: colors.white, fontSize: 26, fontWeight: '900' }}>{remaining}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 }}>
            Record your body response
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        aspectRatio: TILE_ASPECT,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#222833',
      }}>
      {/* Background: photo, or a centered emoji placeholder. */}
      {meal.photo_url ? (
        <Image
          source={{ uri: meal.photo_url }}
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontSize: 52 }}>🍜</Text>
        </View>
      )}

      {/* Scrim so the name + pill stay legible over any image. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']}
        locations={[0, 0.42, 1]}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Status pill, top-left. */}
      <View style={{ position: 'absolute', top: 12, left: 12 }}>
        <StatusPill meal={meal} />
      </View>

      {/* Name + time, bottom. */}
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
        <Text style={{ color: colors.white, fontSize: 15, fontWeight: '800' }} numberOfLines={2}>
          {meal.meal_text}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
          {timeLabel(meal.timestamp)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

/** Small overlay chip reflecting the meal's lifecycle / outcome. */
const StatusPill: React.FC<{ meal: MealRecord }> = ({ meal }) => {
  if (meal.status === 'awaiting_reaction') {
    return (
      <Pill bg={colors.primary} fg={colors.white} icon="restaurant" label="RATE IT" />
    );
  }
  if (meal.status === 'awaiting_body') {
    // body_due_at elapsed (no live countdown) → check-in is ready to log.
    return <Pill bg={colors.primary} fg={colors.white} icon="notifications" label="LOG NOW" />;
  }
  const fullness = meal.actual?.actual_fullness;
  if (fullness != null) {
    return <Pill bg="rgba(255,255,255,0.92)" fg={colors.ink} label={`${fullness}/10 FULL`} />;
  }
  const portion = meal.actual?.portion_eaten;
  if (portion) {
    return <Pill bg="rgba(255,255,255,0.92)" fg={colors.ink} label={`ATE ${portion.toUpperCase()}`} />;
  }
  return null;
};

const Pill: React.FC<{ bg: string; fg: string; icon?: any; label: string }> = ({
  bg,
  fg,
  icon,
  label,
}) => (
  <View
    className="flex-row items-center"
    style={{
      backgroundColor: bg,
      borderRadius: 999,
      paddingVertical: 5,
      paddingHorizontal: 10,
      gap: 5,
    }}>
    {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
    <Text style={{ color: fg, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 }}>{label}</Text>
  </View>
);
