import React from 'react';
import { Text, TextProps } from 'react-native';
import { colors } from './theme';

/** Uppercase, letter-spaced gray label that sits above each screen title. */
export const Kicker: React.FC<TextProps> = ({ style, ...props }) => (
  <Text
    {...props}
    style={[{ color: colors.kicker, fontSize: 11, fontWeight: '600', letterSpacing: 2 }, style]}
  />
);

/** Heavy near-black display title used at the top of every screen. */
export const Title: React.FC<TextProps> = ({ style, ...props }) => (
  <Text
    {...props}
    style={[
      { color: colors.ink, fontSize: 34, fontWeight: '900', lineHeight: 38, letterSpacing: -0.5 },
      style,
    ]}
  />
);

/** Smaller section label inside cards/groups (e.g. FULLNESS, BODY). */
export const GroupLabel: React.FC<TextProps> = ({ style, ...props }) => (
  <Text
    {...props}
    style={[{ color: colors.kicker, fontSize: 11, fontWeight: '600', letterSpacing: 1.5 }, style]}
  />
);
