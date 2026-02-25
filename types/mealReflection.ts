export interface MealReflectionResponse {
  questionIndex: number;   // 0, 1, 2
  questionText: string;
  recordingUrl: string;
  transcriptText: string;
  durationSec: number;
  skipped: boolean;
}

export interface MealReflection {
  id?: string;
  userId: string;
  mealLogId?: string;      // links to mealLogs (Condition A)
  mealSessionId?: string;  // links to mealSessions (Condition B)
  responses: MealReflectionResponse[];
  isComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const REFLECTION_QUESTIONS: string[] = [
  'How did you feel while eating this meal?',
  'How does your body feel after this meal?',
  'What would you do the same or differently next time?',
];
