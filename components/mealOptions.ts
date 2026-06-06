// Static chip option sets pulled from the mockups, shared across screens.

export const CUISINES = [
  'Chinese',
  'Japanese',
  'Korean',
  'Italian',
  'Mexican',
  'American',
  'Mediterranean',
  'Indian',
  'Other',
] as const;

export const DIETARY_RESTRICTIONS = [
  'Vegan',
  'Halal',
  'Kosher',
  'Vegetarian',
  'Gluten-free',
  'Dairy-free',
] as const;

export const EATING_REASONS = [
  'Real hunger',
  'A craving',
  "It's mealtime",
  'Stress / bored',
] as const;

export const CRAVINGS = [
  'warm',
  'light',
  'quick',
  'comforting',
  'fresh',
  'filling',
  'spicy',
  'healthy',
] as const;

// Screen 8 — taste notes (per-flavor descriptive chips) + texture chips.
export const TASTE_NOTES = ['brothy', 'soy', 'mushroom', 'meaty', 'aged'] as const;
export const TEXTURE_NOTES = [
  'fresh',
  'warm',
  'crisp',
  'oily',
  'chewy',
  'silky',
  'spicy',
  'rich',
] as const;

// Screen 9 — mouthfeel chip groups.
export const MOUTHFEEL_BODY = ['watery', 'light', 'full', 'thick', 'coating'] as const;
export const MOUTHFEEL_SURFACE = ['silky', 'velvety', 'oily', 'gritty', 'drying'] as const;
export const MOUTHFEEL_REACTION = [
  'makes me salivate',
  'numbs a little',
  'warms the chest',
  'leaves me thirsty',
] as const;
export const MOUTHFEEL_AFTERTASTE = [
  'clean finish',
  'lingers',
  'salty tail',
  'fades fast',
] as const;

// Screen 10 / 13 — portion eaten.
export const PORTIONS = ['100%', '75%', '50%', '25%', '0%'] as const;
