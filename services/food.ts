import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FoodEntry, NewFoodEntry, UserFoodProfile } from '../types/food';

// ── Food Profile ──────────────────────────────────────────────────────────────

export async function getFoodProfile(userId: string): Promise<UserFoodProfile | null> {
  const ref = doc(db, 'users', userId, 'foodProfile', 'data');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserFoodProfile) : null;
}

export async function updateFoodProfile(
  userId: string,
  updates: Partial<UserFoodProfile>
): Promise<void> {
  const ref = doc(db, 'users', userId, 'foodProfile', 'data');
  await setDoc(ref, updates, { merge: true });
}

// ── Food Entries ──────────────────────────────────────────────────────────────

export async function addFoodEntry(userId: string, entry: NewFoodEntry): Promise<string> {
  const ref = collection(db, 'users', userId, 'foodEntries');
  const now = Timestamp.now();
  // Firebase rejects documents with undefined values — strip them before writing
  const data = Object.fromEntries(
    Object.entries({ ...entry, createdAt: now, updatedAt: now }).filter(([, v]) => v !== undefined)
  );
  const docRef = await addDoc(ref, data);
  return docRef.id;
}

export async function getFoodEntries(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FoodEntry[]> {
  const ref = collection(db, 'users', userId, 'foodEntries');
  let q = query(ref, orderBy('date', 'desc'));

  if (startDate && endDate) {
    q = query(
      ref,
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as FoodEntry);
}

export async function updateFoodEntry(
  userId: string,
  entryId: string,
  updates: Partial<FoodEntry>
): Promise<void> {
  const ref = doc(db, 'users', userId, 'foodEntries', entryId);
  await updateDoc(ref, { ...updates, updatedAt: Timestamp.now() });
}

export async function deleteFoodEntry(userId: string, entryId: string): Promise<void> {
  const ref = doc(db, 'users', userId, 'foodEntries', entryId);
  await deleteDoc(ref);
}
