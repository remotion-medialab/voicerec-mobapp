import React from 'react';
import { View, Text, Image } from 'react-native';
import { colors } from '../ui';

/** Small rounded pill showing the meal name + an optional timestamp range. */
export const MealPill: React.FC<{ mealText: string; time?: string; photoUrl?: string }> = ({
  mealText,
  time,
  photoUrl,
}) => (
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
    {photoUrl ? (
      <Image source={{ uri: photoUrl }} style={{ width: 20, height: 20, borderRadius: 10 }} />
    ) : (
      <Text style={{ fontSize: 16 }}>🍜</Text>
    )}
    <Text style={{ color: colors.ink, fontSize: 14, fontWeight: '600' }}>{mealText}</Text>
    {time ? <Text style={{ color: colors.kicker, fontSize: 12 }}>{time}</Text> : null}
  </View>
);
