import {
  collection,
  addDoc,
  updateDoc,
  getDocs,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MealSession, MealSessionStatus } from '../types/mealSession';

export const createMealSession = async (session: Omit<MealSession, 'id'>): Promise<string> => {
  const ref = collection(db, 'users', session.userId, 'mealSessions');
  // Strip undefined fields — Firestore rejects them
  const data = Object.fromEntries(Object.entries(session).filter(([, v]) => v !== undefined));
  const docRef = await addDoc(ref, data);
  return docRef.id;
};

export const updateMealSession = async (
  userId: string,
  sessionId: string,
  updates: Partial<MealSession>
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'mealSessions', sessionId);
  const data = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  await updateDoc(ref, data);
};

export const getMealSessions = async (
  userId: string,
  status?: MealSessionStatus
): Promise<MealSession[]> => {
  const ref = collection(db, 'users', userId, 'mealSessions');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  const sessions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MealSession));
  return status ? sessions.filter((s) => s.status === status) : sessions;
};
