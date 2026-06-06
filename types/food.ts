import { Timestamp } from 'firebase/firestore';

export interface TasteProfile {
  sweet: number;
  salty: number;
  savory: number;
  spicy: number;
  sour: number;
}

export interface FoodEntry {
  id: string;
  userId: string;
  date: Timestamp;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  photoUrl?: string;
  calories?: number;
  tasteProfile: TasteProfile;
  moodRating: number;    // 1–6
  bodyFeeling: number;   // 0–100
  howClose: number;      // 0–100
  reflectionText: string;
  aiCompanionSummary?: string;
  location?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type NewFoodEntry = Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'>;

export interface UserFoodProfile {
  uid: string;
  favoriteCuisines: string[];
  restrictions: string[];
  goals: string[];
  foodLoveDescription: string;
  changeDescription: string;
  onboardingComplete: boolean;
}

export const DEFAULT_TASTE_PROFILE: TasteProfile = {
  sweet: 0,
  salty: 0,
  savory: 0,
  spicy: 0,
  sour: 0,
};

export const CUISINE_OPTIONS = [
  'Japanese', 'Chinese', 'Korean', 'Thai', 'Vietnamese',
  'Italian', 'Mexican', 'Indian', 'American', 'Mediterranean',
  'French', 'Middle Eastern', 'Greek', 'Spanish', 'Ethiopian',
];

export const RESTRICTION_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free',
  'Nut-free', 'Halal', 'Kosher', 'Low-carb', 'Keto',
];

export const GOAL_OPTIONS = [
  'Eat more mindfully', 'Cook more at home', 'Eat more vegetables',
  'Reduce sugar', 'Try new cuisines', 'Improve energy levels',
  'Manage portions', 'Reduce eating out',
];

export const FEELING_OPTIONS = [
  'Satisfied', 'Full', 'Light', 'Energized', 'Sluggish',
  'Bloated', 'Content', 'Still hungry', 'Nourished', 'Guilty',
];
