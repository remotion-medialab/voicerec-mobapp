export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealLog {
  id?: string;
  userId: string;
  imageUrl: string;
  estimatedCalories: number;
  calorieBreakdown?: string;
  calorieConfidence?: 'low' | 'medium' | 'high';
  mealType: MealType;
  feelingAfterEating: string;
  bodyResponseAfterEating: string;
  linkedGoal: string;
  timestamp: Date;
}
