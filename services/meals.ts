// Meal-lifecycle writers/readers (Phases B–F of the schema).
// Collection-per-title model: each schema object lives in its own collection
// under users/{uid}, joined by meal_id. The meal_id is the MealSession doc id.

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  PreMealMood,
  MealSession,
  UserPrediction,
  TasteRating,
  MouthfeelRating,
  ActualOutcomes,
  Reflection,
  BodyNote,
  EditMealLog,
  MealRecord,
  toDate,
} from '../types/meal';

function requireUid(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.uid;
}

const col = (uid: string, name: string) => collection(db, 'users', uid, name);

// ----- Phase B -------------------------------------------------------------

/** Schema: PreMealMood → users/{uid}/preMealMoods/{auto}. Returns the doc id. */
export async function savePreMealMood(input: Omit<PreMealMood, 'user_id'>): Promise<string> {
  const uid = requireUid();
  const data: PreMealMood = { user_id: uid, ...input };
  const ref = await addDoc(col(uid, 'preMealMoods'), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

/**
 * Schema: MealSession → users/{uid}/mealSessions/{mealId}.
 * The generated doc id IS the meal_id threaded through every later phase.
 */
export async function createMealSession(
  input: Omit<MealSession, 'session_id' | 'user_id' | 'timestamp'>
): Promise<string> {
  const uid = requireUid();
  const ref = doc(col(uid, 'mealSessions'));
  const data: MealSession = {
    session_id: ref.id,
    user_id: uid,
    timestamp: new Date().toISOString(),
    ...input,
  };
  await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  return ref.id; // == meal_id
}

/** Attach/replace the photo on a meal's MealSession (used at log time + edit). */
export async function setMealPhoto(mealId: string, photoUrl: string): Promise<void> {
  const uid = requireUid();
  await setDoc(doc(col(uid, 'mealSessions'), mealId), { photo_url: photoUrl }, { merge: true });
}

// ----- Phase C -------------------------------------------------------------

/** Schema: UserPrediction → users/{uid}/predictions/{auto} */
export async function savePrediction(
  input: Omit<UserPrediction, 'user_id' | 'locked_at'>
): Promise<string> {
  const uid = requireUid();
  const data: UserPrediction = { user_id: uid, locked_at: new Date().toISOString(), ...input };
  const ref = await addDoc(col(uid, 'predictions'), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

// ----- Phase D -------------------------------------------------------------

/** Schema: TasteRating → users/{uid}/tasteRatings/{auto} */
export async function saveTasteRating(input: TasteRating): Promise<string> {
  const uid = requireUid();
  const ref = await addDoc(col(uid, 'tasteRatings'), { ...input, createdAt: serverTimestamp() });
  return ref.id;
}

/** Schema: MouthfeelRating → users/{uid}/mouthfeelRatings/{auto} */
export async function saveMouthfeelRating(input: MouthfeelRating): Promise<string> {
  const uid = requireUid();
  const ref = await addDoc(col(uid, 'mouthfeelRatings'), {
    ...input,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ----- Phase E -------------------------------------------------------------

/** Schema: ActualOutcomes → users/{uid}/actualOutcomes/{auto} */
export async function saveActualOutcomes(
  input: Omit<ActualOutcomes, 'logged_at'>
): Promise<string> {
  const uid = requireUid();
  const data: ActualOutcomes = { logged_at: new Date().toISOString(), ...input };
  const ref = await addDoc(col(uid, 'actualOutcomes'), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

/** Schema: Reflection → users/{uid}/reflections/{auto} */
export async function saveReflection(input: Reflection): Promise<string> {
  const uid = requireUid();
  const ref = await addDoc(col(uid, 'reflections'), { ...input, createdAt: serverTimestamp() });
  return ref.id;
}

/** Schema: BodyNote → users/{uid}/bodyNotes/{auto} */
export async function saveBodyNote(input: BodyNote): Promise<string> {
  const uid = requireUid();
  const ref = await addDoc(col(uid, 'bodyNotes'), { ...input, createdAt: serverTimestamp() });
  return ref.id;
}

// ----- Phase F -------------------------------------------------------------

/**
 * Schema: EditMealLog → users/{uid}/mealEdits/{auto} (audit trail) plus the
 * corresponding live documents are patched so the feed reflects the edit.
 */
export async function saveMealEdit(input: EditMealLog): Promise<void> {
  const uid = requireUid();
  await addDoc(col(uid, 'mealEdits'), { ...input, createdAt: serverTimestamp() });

  // Patch the meal_text on the session.
  if (input.meal_text !== undefined) {
    await setDoc(
      doc(col(uid, 'mealSessions'), input.meal_id),
      { meal_text: input.meal_text },
      { merge: true }
    );
  }

  // Patch the actual outcomes (latest doc for this meal), if those fields changed.
  const outcomePatch = pickDefined({
    portion_eaten: input.portion_eaten,
    actual_fullness: input.actual_fullness,
    actual_energy: input.actual_energy,
    actual_satisfaction: input.actual_satisfaction,
  });
  if (Object.keys(outcomePatch).length > 0) {
    const latest = await latestDocForMeal(uid, 'actualOutcomes', input.meal_id);
    if (latest) await setDoc(latest, outcomePatch, { merge: true });
  }
}

// ----- Reads ---------------------------------------------------------------

async function latestDocForMeal(uid: string, name: string, mealId: string) {
  const q = query(col(uid, name), where('meal_id', '==', mealId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  // Newest by createdAt when present.
  const docs = snap.docs.sort(
    (a, b) => toDate(b.data().createdAt).getTime() - toDate(a.data().createdAt).getTime()
  );
  return docs[0].ref;
}

async function firstByMeal<T>(uid: string, name: string, mealId: string): Promise<T | undefined> {
  const q = query(col(uid, name), where('meal_id', '==', mealId));
  const snap = await getDocs(q);
  return snap.empty ? undefined : (snap.docs[0].data() as T);
}

/** Get a single meal joined with its ratings/outcomes (for the edit screen). */
export async function getMealRecord(mealId: string): Promise<MealRecord | null> {
  const uid = requireUid();
  const sessionSnap = await getDoc(doc(col(uid, 'mealSessions'), mealId));
  if (!sessionSnap.exists()) return null;
  const session = sessionSnap.data() as MealSession & { createdAt?: unknown };
  const [prediction, taste, mouthfeel, actual, reflection, bodyNote] = await Promise.all([
    firstByMeal<UserPrediction>(uid, 'predictions', mealId),
    firstByMeal<TasteRating>(uid, 'tasteRatings', mealId),
    firstByMeal<MouthfeelRating>(uid, 'mouthfeelRatings', mealId),
    firstByMeal<ActualOutcomes>(uid, 'actualOutcomes', mealId),
    firstByMeal<Reflection>(uid, 'reflections', mealId),
    firstByMeal<BodyNote>(uid, 'bodyNotes', mealId),
  ]);
  return {
    meal_id: mealId,
    meal_text: session.meal_text,
    photo_url: session.photo_url,
    timestamp: toDate(session.timestamp),
    prediction,
    taste,
    mouthfeel,
    actual,
    reflection,
    bodyNote,
  };
}

/** List all meals (newest first) joined with actuals — powers the feed + calendar. */
export async function listMeals(): Promise<MealRecord[]> {
  const uid = requireUid();
  const snap = await getDocs(query(col(uid, 'mealSessions'), orderBy('timestamp', 'desc')));
  const sessions = snap.docs.map((d) => d.data() as MealSession);

  return Promise.all(
    sessions.map(async (s) => {
      const actual = await firstByMeal<ActualOutcomes>(uid, 'actualOutcomes', s.session_id);
      return {
        meal_id: s.session_id,
        meal_text: s.meal_text,
        photo_url: s.photo_url,
        timestamp: toDate(s.timestamp),
        actual,
      } as MealRecord;
    })
  );
}

function pickDefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
