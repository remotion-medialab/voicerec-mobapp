export type MealSessionStatus = 'awaiting_post_meal_log' | 'completed' | 'cancelled';
export type MealSessionMode = 'cook_at_home' | 'eat_out';

export interface MealSession {
  id?: string;
  userId: string;
  mode: MealSessionMode;
  status: MealSessionStatus;
  // Inputs
  ingredientsText?: string;    // cook_at_home
  menuImageUrl?: string;       // eat_out
  mealIntention: string;
  linkedGoal: string;
  // Recommendation
  recommendationText: string;  // dish or items.join(', ') — shown in list
  recommendationRationale: string;
  recommendationMetadata: {
    dish?: string;
    steps?: string[];
    items?: string[];
    alternatives?: string;
  };
  // Post-meal (populated on completion)
  actualMealPhotoUrl?: string;
  estimatedCalories?: number;
  calorieBreakdown?: string;
  calorieConfidence?: 'low' | 'medium' | 'high';
  mealType?: string;
  feelingAfterEating?: string;
  bodyResponseAfterEating?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
