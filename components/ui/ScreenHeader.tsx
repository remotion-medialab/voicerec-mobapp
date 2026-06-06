import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './theme';

interface ScreenHeaderProps {
  onBack?: () => void;
  /** Right-aligned step indicator, e.g. "Step 3 of 5" or "+30 min · 1 of 4". */
  step?: string;
}

/** White circular back chevron + right-aligned step text, over the gradient. */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ onBack, step }) => (
  <View className="flex-row items-center justify-between px-5 pb-2 pt-2">
    {onBack ? (
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.8}
        className="h-10 w-10 items-center justify-center rounded-full bg-white"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}>
        <Ionicons name="chevron-back" size={20} color={colors.ink} />
      </TouchableOpacity>
    ) : (
      <View className="h-10 w-10" />
    )}

    {step ? (
      <Text style={{ color: colors.kicker, fontSize: 12, letterSpacing: 1, fontWeight: '500' }}>
        {step}
      </Text>
    ) : null}
  </View>
);
