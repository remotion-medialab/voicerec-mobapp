import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from './theme';

type ChipVariant = 'blue' | 'dark';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  variant?: ChipVariant;
}

/** Pill chip — fills blue or near-black when selected, outlined when not. */
export const Chip: React.FC<ChipProps> = ({ label, selected, onPress, variant = 'blue' }) => {
  const selectedBg = variant === 'blue' ? colors.primary : colors.ink;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: selected ? selectedBg : colors.white,
        borderColor: selected ? selectedBg : colors.border,
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 9,
        paddingHorizontal: 16,
      }}>
      <Text
        style={{
          color: selected ? colors.white : colors.inkSoft,
          fontSize: 14,
          fontWeight: '500',
        }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

interface ChipGroupProps {
  options: readonly string[];
  /** Selected values (multi-select). */
  value: string[];
  onChange: (next: string[]) => void;
  variant?: ChipVariant;
  /** Cap the number of selections (e.g. cuisines: pick up to 3). */
  max?: number;
}

/** Wrapping row of multi-select chips. */
export const ChipGroup: React.FC<ChipGroupProps> = ({ options, value, onChange, variant, max }) => {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, opt]);
    }
  };

  return (
    <View className="flex-row flex-wrap" style={{ gap: 10 }}>
      {options.map((opt) => (
        <Chip
          key={opt}
          label={opt}
          selected={value.includes(opt)}
          onPress={() => toggle(opt)}
          variant={variant}
        />
      ))}
    </View>
  );
};
