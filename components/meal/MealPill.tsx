import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../ui';

/** Small rounded pill showing the meal name + an optional timestamp range. */
export const MealPill: React.FC<{ mealText: string; time?: string }> = ({ mealText, time }) => (
  <View
    className="flex-row items-center self-start"
    style={{
      backgroundColor: colors.white,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 999,
      paddingVertical: 6,
      paddingHorizontal: 12,
      gap: 8,
    }}>
    <Text style={{ fontSize: 16 }}>🍜</Text>
    <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>{mealText}</Text>
    {time ? <Text style={{ color: colors.kicker, fontSize: 12 }}>{time}</Text> : null}
  </View>
);
