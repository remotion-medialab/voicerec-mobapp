// Onboarding profile writers/readers (Phase A of the schema).
// Each function maps 1:1 to a schema title and writes the document at the
// path described in the build plan, under users/{uid}.

import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { UserTastes, DietaryProfile, VoiceResponse, VoiceQuestionId } from '../types/meal';

function requireUid(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  return user.uid;
}

/** Schema: UserTastes → users/{uid}/tastes/current */
export async function saveTastes(input: Omit<UserTastes, 'user_id'>): Promise<void> {
  const uid = requireUid();
  const data: UserTastes = { user_id: uid, ...input };
  await setDoc(doc(db, 'users', uid, 'tastes', 'current'), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getTastes(): Promise<UserTastes | null> {
  const uid = requireUid();
  const snap = await getDoc(doc(db, 'users', uid, 'tastes', 'current'));
  return snap.exists() ? (snap.data() as UserTastes) : null;
}

/** Schema: DietaryProfile → users/{uid}/dietary/current */
export async function saveDietary(input: Omit<DietaryProfile, 'user_id'>): Promise<void> {
  const uid = requireUid();
  const data: DietaryProfile = { user_id: uid, ...input };
  await setDoc(doc(db, 'users', uid, 'dietary', 'current'), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getDietary(): Promise<DietaryProfile | null> {
  const uid = requireUid();
  const snap = await getDoc(doc(db, 'users', uid, 'dietary', 'current'));
  return snap.exists() ? (snap.data() as DietaryProfile) : null;
}

/**
 * Schema: VoiceResponse → users/{uid}/voiceResponses/{question_id}
 * Text-only mode: transcript holds the typed answer, audio_url is omitted.
 */
export async function saveVoiceResponse(
  questionId: VoiceQuestionId,
  transcript: string
): Promise<void> {
  const uid = requireUid();
  const data: VoiceResponse = {
    user_id: uid,
    question_id: questionId,
    transcript,
    recorded_at: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', uid, 'voiceResponses', questionId), data);
}

/** True once the user has stored their core tastes — used to skip onboarding. */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const tastes = await getTastes();
    return tastes !== null;
  } catch {
    return false;
  }
}
