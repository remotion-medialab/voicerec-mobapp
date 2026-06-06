import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from './theme';

/** Linear-interpolate two #rrggbb colors at t∈[0,1]. */
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const BANDS = 14;

/**
 * Soft light-periwinkle → white vertical gradient at the top of every screen.
 * Implemented as stacked color bands so it needs no native gradient module.
 */
export const GradientBackground: React.FC<{ height?: number }> = ({ height = 340 }) => (
  <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.white }]} pointerEvents="none">
    <View style={{ height }}>
      {Array.from({ length: BANDS }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: mix(colors.headerTop, colors.headerBottom, i / (BANDS - 1)),
          }}
        />
      ))}
    </View>
  </View>
);
