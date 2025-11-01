import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { ReflectionAnswers } from '../types/session';

/**
 * Service for managing reflection questions and answers
 */
export class ReflectionService {
  /**
   * Save reflection answers for a session
   */
  static async saveReflectionAnswers(
    sessionNumber: number,
    answers: Partial<ReflectionAnswers>
  ): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const sessionRef = doc(db, 'users', user.uid, 'sessions', `session${sessionNumber}`);

      await setDoc(
        sessionRef,
        {
          reflectionAnswers: answers,
          answersCompletedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`✅ Reflection answers saved for session ${sessionNumber}`);
    } catch (error) {
      console.error('Error saving reflection answers:', error);
      throw error;
    }
  }

  /**
   * Get reflection answers for a session
   */
  static async getReflectionAnswers(
    sessionNumber: number
  ): Promise<Partial<ReflectionAnswers> | null> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const sessionRef = doc(db, 'users', user.uid, 'sessions', `session${sessionNumber}`);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        return null;
      }

      const sessionData = sessionSnap.data();
      return sessionData.reflectionAnswers || null;
    } catch (error) {
      console.error('Error getting reflection answers:', error);
      throw error;
    }
  }
}
