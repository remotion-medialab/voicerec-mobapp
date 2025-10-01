import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Goal, GoalData } from '../types/goals';

export class GoalService {
  // Create a new goal
  static async createGoal(goalData: GoalData): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const goalDocData = {
        ...goalData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Store goals as subcollection under users/{userId}/goals
      const docRef = await addDoc(collection(db, 'users', user.uid, 'goals'), goalDocData);
      console.log('Goal created with ID:', docRef.id);

      return docRef.id;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }

  // Get all goals for the current user
  static async getUserGoals(): Promise<Goal[]> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Query goals from users/{userId}/goals subcollection
      const q = query(collection(db, 'users', user.uid, 'goals'), orderBy('createdAt', 'desc'));

      const querySnapshot = await getDocs(q);
      const goals: Goal[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        goals.push({
          id: doc.id,
          goal: data.goal,
          timeOfDay: data.timeOfDay,
          intensityFrequency: data.intensityFrequency,
          locations: data.locations,
          userId: data.userId,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });

      return goals;
    } catch (error) {
      console.error('Error fetching user goals:', error);
      throw error;
    }
  }

  // Update an existing goal
  static async updateGoal(goalId: string, updates: Partial<GoalData>): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Reference goal in users/{userId}/goals subcollection
      const goalRef = doc(db, 'users', user.uid, 'goals', goalId);
      await updateDoc(goalRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      console.log('Goal updated:', goalId);
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  // Delete a goal
  static async deleteGoal(goalId: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Reference goal in users/{userId}/goals subcollection
      const goalRef = doc(db, 'users', user.uid, 'goals', goalId);
      await deleteDoc(goalRef);

      console.log('Goal deleted:', goalId);
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }
}
