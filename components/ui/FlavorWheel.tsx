import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors, flavorColors, FLAVOR_ORDER, FlavorKey } from './theme';

export type FlavorLevels = Partial<Record<FlavorKey, number>>;

interface FlavorWheelProps {
  value: FlavorLevels;
  onChange: (next: FlavorLevels) => void;
  size?: number;
  maxLevel?: number;
}

/**
 * Five-taste radial wheel. Each taste is a petal pointing out from a center hub;
 * tap a petal to "dial it up" — its length and color intensity grow with the
 * strength, and the hub shows how many tastes are active. Pure Views (no SVG).
 */
export const FlavorWheel: React.FC<FlavorWheelProps> = ({
  value,
  onChange,
  size = 240,
  maxLevel = 3,
}) => {
  const cx = size / 2;
  const hubR = size * 0.15;
  const petalW = size * 0.2;
  const labelR = size * 0.46;
  const seg = 360 / FLAVOR_ORDER.length; // 72°

  const activeCount = FLAVOR_ORDER.filter((f) => (value[f] ?? 0) > 0).length;

  const bump = (f: FlavorKey) => {
    const current = value[f] ?? 0;
    const next = current >= maxLevel ? 0 : current + 1; // tap past max clears
    onChange({ ...value, [f]: next });
  };

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      {/* Petals */}
      {FLAVOR_ORDER.map((f, i) => {
        const level = value[f] ?? 0;
        const angle = i * seg;
        const petalLen = size * (0.18 + 0.16 * (level / maxLevel));
        const distance = hubR + petalLen / 2 + 2;
        return (
          <TouchableOpacity
            key={f}
            onPress={() => bump(f)}
            activeOpacity={0.7}
            style={{
              position: 'absolute',
              left: cx - petalW / 2,
              top: size / 2 - petalLen / 2,
              width: petalW,
              height: petalLen,
              borderRadius: petalW / 2,
              backgroundColor: flavorColors[f],
              opacity: level > 0 ? 1 : 0.45,
              transform: [{ rotate: `${angle}deg` }, { translateY: -distance }],
            }}
          />
        );
      })}

      {/* Center hub */}
      <View
        style={{
          position: 'absolute',
          left: cx - hubR,
          top: cx - hubR,
          width: hubR * 2,
          height: hubR * 2,
          borderRadius: hubR,
          backgroundColor: colors.white,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}>
        <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '800' }}>{activeCount}</Text>
        <Text style={{ color: colors.kicker, fontSize: 8, letterSpacing: 1 }}>TASTES</Text>
      </View>

      {/* Labels */}
      {FLAVOR_ORDER.map((f, i) => {
        const a = (i * seg * Math.PI) / 180;
        const x = cx + labelR * Math.sin(a);
        const y = cx - labelR * Math.cos(a);
        return (
          <Text
            key={f}
            style={{
              position: 'absolute',
              width: 84,
              textAlign: 'center',
              left: x - 42,
              top: y - 8,
              fontSize: 12,
              fontWeight: '700',
              color: colors.ink,
            }}>
            {f}
          </Text>
        );
      })}
    </View>
  );
};

/** Normalize raw strengths into proportions for TasteRating.flavor_breakdown. */
export function toFlavorBreakdown(levels: FlavorLevels): Partial<Record<FlavorKey, number>> {
  const total = FLAVOR_ORDER.reduce((sum, f) => sum + (levels[f] ?? 0), 0);
  if (total === 0) return {};
  const out: Partial<Record<FlavorKey, number>> = {};
  FLAVOR_ORDER.forEach((f) => {
    const v = levels[f] ?? 0;
    if (v > 0) out[f] = Math.round((v / total) * 100) / 100;
  });
  return out;
}
