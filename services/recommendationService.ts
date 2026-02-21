import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RecommendationLog } from '../types/recommendationLog';

export const saveRecommendationLog = async (log: RecommendationLog): Promise<string> => {
  const ref = collection(db, 'users', log.userId, 'recommendationLogs');
  const docRef = await addDoc(ref, log);
  return docRef.id;
};

export const getRecommendationLogs = async (userId: string): Promise<RecommendationLog[]> => {
  const ref = collection(db, 'users', userId, 'recommendationLogs');
  const q = query(ref, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RecommendationLog));
};
