import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MealReflection } from '../types/mealReflection';

export const createMealReflection = async (
  reflection: Omit<MealReflection, 'id'>
): Promise<string> => {
  const ref = collection(db, 'users', reflection.userId, 'mealReflections');
  const data = Object.fromEntries(Object.entries(reflection).filter(([, v]) => v !== undefined));
  const docRef = await addDoc(ref, data);
  return docRef.id;
};

export const updateMealReflection = async (
  userId: string,
  reflectionId: string,
  updates: Partial<MealReflection>
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'mealReflections', reflectionId);
  const data = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  await updateDoc(ref, data);
};
