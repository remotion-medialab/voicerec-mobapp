import React from 'react';
import { Text, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Trailing arrow icon, as in most mockup CTAs. */
  arrow?: boolean;
}

/** Full-width rounded-full blue CTA used at the bottom of every flow screen. */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  disabled,
  loading,
  arrow = true,
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.85}
    style={{
      backgroundColor: disabled ? '#A9B4E6' : colors.primary,
      borderRadius: 999,
      paddingVertical: 18,
      shadowColor: colors.primary,
      shadowOpacity: disabled ? 0 : 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    }}>
    {loading ? (
      <ActivityIndicator color={colors.white} />
    ) : (
      <View className="flex-row items-center justify-center">
        <Text style={{ color: colors.white, fontSize: 16, fontWeight: '700' }}>{label}</Text>
        {arrow ? (
          <Ionicons name="arrow-forward" size={18} color={colors.white} style={{ marginLeft: 8 }} />
        ) : null}
      </View>
    )}
  </TouchableOpacity>
);
