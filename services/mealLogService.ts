import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MealLog } from '../types/mealLog';

export const saveMealLog = async (log: MealLog): Promise<string> => {
  const ref = collection(db, 'users', log.userId, 'mealLogs');
  const docRef = await addDoc(ref, log);
  return docRef.id;
};

export const getMealLogs = async (userId: string): Promise<MealLog[]> => {
  const ref = collection(db, 'users', userId, 'mealLogs');
  const q = query(ref, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MealLog));
};
