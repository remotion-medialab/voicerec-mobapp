// MealBody design tokens, derived from the design_screens mockups.
// Centralized so every screen pulls the same palette/spacing.

export const colors = {
  primary: '#4361EE', // royal-periwinkle CTA / selected cuisine chips
  primaryDark: '#3550D8',
  ink: '#15171C', // heavy display titles / selected dark chips
  inkSoft: '#3A3F4A',
  kicker: '#9AA0AE', // uppercase letter-spaced labels
  subtle: '#6B7280',
  border: '#E3E6EC',
  trackInactive: '#E6E8EE',
  field: '#F1F3F7', // input / voice box fill
  headerTop: '#DCE4F7', // gradient header start
  headerBottom: '#FFFFFF', // gradient header end
  white: '#FFFFFF',
} as const;

// 5-segment flavor wheel, clockwise from top: umami, salty, sweet, sour, bitter.
export const flavorColors = {
  umami: '#8FA0E8',
  salty: '#4F66E8',
  sweet: '#CC8BA6',
  sour: '#8FBF6F',
  bitter: '#D9D5CC',
} as const;

export type FlavorKey = keyof typeof flavorColors;
export const FLAVOR_ORDER: FlavorKey[] = ['umami', 'salty', 'sweet', 'sour', 'bitter'];
