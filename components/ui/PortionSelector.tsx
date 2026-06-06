import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors } from './theme';
import { PORTIONS } from '../mealOptions';

interface PortionSelectorProps {
  value: string | null;
  onChange: (v: string) => void;
}

/** Row of portion-eaten buttons (100% … 0%), single-select. */
export const PortionSelector: React.FC<PortionSelectorProps> = ({ value, onChange }) => (
  <View className="flex-row" style={{ gap: 8 }}>
    {PORTIONS.map((p) => {
      const selected = value === p;
      return (
        <TouchableOpacity
          key={p}
          onPress={() => onChange(p)}
          activeOpacity={0.8}
          className="flex-1 items-center justify-center"
          style={{
            backgroundColor: selected ? colors.primary : colors.white,
            borderColor: selected ? colors.primary : colors.border,
            borderWidth: 1,
            borderRadius: 14,
            paddingVertical: 16,
          }}>
          <Text
            style={{
              color: selected ? colors.white : colors.inkSoft,
              fontWeight: '700',
              fontSize: 15,
            }}>
            {p}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);
