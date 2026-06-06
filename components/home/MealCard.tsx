import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../ui';
import { timeLabel } from './dateUtils';
import { MealRecord } from '../../types/meal';

interface MealCardProps {
  meal: MealRecord;
  onPress: () => void;
}

/** Feed card: thumbnail, meal name, time, and a glance at the logged outcome. */
export const MealCard: React.FC<MealCardProps> = ({ meal, onPress }) => {
  const fullness = meal.actual?.actual_fullness;
  const portion = meal.actual?.portion_eaten;

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
        className="items-center justify-center"
        style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.field }}>
        <Text style={{ fontSize: 26 }}>🍜</Text>
      </View>

      <View className="flex-1">
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
          {meal.meal_text}
        </Text>
        <Text style={{ color: colors.kicker, fontSize: 12, marginTop: 2 }}>
          {timeLabel(meal.timestamp)}
          {portion ? ` · ate ${portion}` : ''}
        </Text>
      </View>

      {fullness != null ? (
        <View className="items-end" style={{ paddingRight: 4 }}>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18 }}>
            {fullness}
            <Text style={{ color: colors.kicker, fontSize: 11 }}>/10</Text>
          </Text>
          <Text style={{ color: colors.kicker, fontSize: 10, letterSpacing: 1 }}>FULL</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.kicker} />
      )}
    </TouchableOpacity>
  );
};
