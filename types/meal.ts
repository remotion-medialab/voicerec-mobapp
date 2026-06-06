// MealBody data model — one TypeScript interface per schema title in
// design_screens/schema.md. Field names are kept in the schema's snake_case so
// the Firestore documents match the spec exactly (collection-per-title model).

import { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// PHASE A — Onboarding (one-time)
// ---------------------------------------------------------------------------

export type FlavorProfile = 'umami' | 'salty' | 'sweet' | 'sour' | 'bitter';

/** Schema: UserTastes — users/{uid}/tastes/current */
export interface UserTastes {
  user_id: string;
  preferred_cuisines: string[];
  flavor_preferences: FlavorProfile[];
  dislikes?: string;
}

/** Schema: DietaryProfile — users/{uid}/dietary/current */
export interface DietaryProfile {
  user_id: string;
  dietary_restrictions: string[];
  allergies: string[];
}

export type VoiceQuestionId = 'goals_habits' | 'routine' | 'food_love';

/** Schema: VoiceResponse — users/{uid}/voiceResponses/{question_id} */
export interface VoiceResponse {
  user_id: string;
  question_id: VoiceQuestionId;
  audio_url?: string;
  transcript: string;
  recorded_at: string; // ISO date-time
}

// ---------------------------------------------------------------------------
// PHASE B — Pre-meal decision
// ---------------------------------------------------------------------------

/** Schema: PreMealMood — users/{uid}/preMealMoods/{id} */
export interface PreMealMood {
  user_id: string;
  voice_input?: string;
  eating_reason?: string;
  current_hunger?: number; // 1-10
  target_fullness?: number; // 1-10
  cravings?: string[];
}

/** Mood selections held in the log flow before they're persisted. */
export type PreMealMoodInput = Omit<PreMealMood, 'user_id'>;

/**
 * Lifecycle of the 3-phase meal log:
 * - awaiting_reaction: Phase 1 done (logged + predicted), needs immediate reaction
 * - awaiting_body: Phase 2 done (taste + feel), 30-min body check-in pending
 * - complete: Phase 3 done (delayed check-in finished)
 */
export type MealStatus = 'awaiting_reaction' | 'awaiting_body' | 'complete';

/** Schema: MealSession — users/{uid}/mealSessions/{mealId} (doc id == meal_id) */
export interface MealSession {
  session_id: string;
  user_id: string;
  meal_text: string;
  parsed_items?: Record<string, unknown>[];
  action_taken?: string;
  photo_url?: string;
  timestamp: string; // ISO date-time
  // App-level lifecycle fields (beyond the base schema):
  status?: MealStatus;
  body_due_at?: string; // ISO — when the delayed check-in unlocks / notif fires
  notification_id?: string; // scheduled local-notification id (for cancellation)
}

// ---------------------------------------------------------------------------
// PHASE C — Pre-meal prediction / calibration
// ---------------------------------------------------------------------------

/** Schema: UserPrediction — users/{uid}/predictions/{id} */
export interface UserPrediction {
  meal_id: string;
  user_id: string;
  pre_meal_note?: string;
  predicted_fullness?: number; // 1-10
  predicted_energy?: number; // 1-10
  predicted_satisfaction?: number; // 1-10
  locked_at: string; // ISO date-time
}

// ---------------------------------------------------------------------------
// PHASE D — Right after eating
// ---------------------------------------------------------------------------

/** Schema: TasteRating — users/{uid}/tasteRatings/{id} */
export interface TasteRating {
  meal_id: string;
  flavor_breakdown?: Partial<Record<FlavorProfile, number>>;
  flavor_strength?: number; // 1-10
  taste_notes?: string[];
  texture_notes?: string[];
}

/** Schema: MouthfeelRating — users/{uid}/mouthfeelRatings/{id} */
export interface MouthfeelRating {
  meal_id: string;
  body?: string[];
  surface?: string[];
  reaction?: string[];
  aftertaste?: string[];
}

// ---------------------------------------------------------------------------
// PHASE E — Post-meal check-in (+30 min)
// ---------------------------------------------------------------------------

export type PortionEaten = '100%' | '75%' | '50%' | '25%' | '0%';

/** Schema: ActualOutcomes — users/{uid}/actualOutcomes/{id} */
export interface ActualOutcomes {
  meal_id: string;
  portion_eaten: PortionEaten;
  actual_fullness?: number; // 1-10
  actual_energy?: number; // 1-10
  actual_satisfaction?: number; // 1-10
  logged_at: string; // ISO date-time
}

export type InputMethod = 'text' | 'voice';

/** Schema: Reflection — users/{uid}/reflections/{id} */
export interface Reflection {
  meal_id: string;
  causal_attribution?: string;
  input_method?: InputMethod;
}

/** Schema: BodyNote — users/{uid}/bodyNotes/{id} */
export interface BodyNote {
  meal_id: string;
  body_note?: string;
  audio_url?: string;
}

// ---------------------------------------------------------------------------
// PHASE F — Edit / review
// ---------------------------------------------------------------------------

/** Schema: EditMealLog — users/{uid}/mealEdits/{id} */
export interface EditMealLog {
  meal_id: string;
  meal_text?: string;
  actual_fullness?: number;
  actual_energy?: number;
  actual_satisfaction?: number;
  portion_eaten?: string;
  user_note?: string;
}

// ---------------------------------------------------------------------------
// Read models — what the feed / calendar / edit screens consume
// ---------------------------------------------------------------------------

/** A meal session joined with its ratings/outcomes, as read for the feed. */
export interface MealRecord {
  meal_id: string;
  meal_text: string;
  photo_url?: string;
  timestamp: Date;
  status: MealStatus;
  body_due_at?: Date;
  prediction?: UserPrediction;
  taste?: TasteRating;
  mouthfeel?: MouthfeelRating;
  actual?: ActualOutcomes;
  reflection?: Reflection;
  bodyNote?: BodyNote;
}

/** Firestore stores ISO strings or Timestamps; normalize either to Date. */
export function toDate(value: string | Timestamp | Date | undefined): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  return value.toDate();
}
