export type MealMode = 'cook_at_home' | 'eat_out';

export interface RecommendationLog {
  id?: string;
  userId: string;
  mode: MealMode;
  ingredientsText?: string;
  menuImageUrl?: string;
  mealIntention: string;
  linkedGoal: string;
  recommendationText: string;
  rationale: string;
  alternatives?: string;
  timestamp: Date;
}
