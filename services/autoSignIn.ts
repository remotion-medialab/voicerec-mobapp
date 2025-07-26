import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface AutoUserProfile {
  uid: string;
  email: string;
  createdAt: Date;
  lastActive: Date;
  autoCreated: boolean;
}

/**
 * Ultra-simple: Try to sign in, if user doesn't exist, auto-create account
 */
export const autoSignIn = async (email: string, password: string) => {
  try {
    // Try to sign in first
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log('👤 User not found, auto-creating account...');
      
      // Auto-create account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create profile
      const profile: AutoUserProfile = {
        uid: userCredential.user.uid,
        email,
        createdAt: new Date(),
        lastActive: new Date(),
        autoCreated: true,
      };
      
      await setDoc(doc(db, 'users', userCredential.user.uid), profile);
      console.log('✅ Account auto-created and user signed in');
      
      return userCredential;
    }
    
    // Re-throw other errors
    throw error;
  }
};

/**
 * Ultra-simple: Try to sign in, if user doesn't exist, auto-create account
 */
export const autoSignUp = async (email: string, password: string, displayName?: string) => {
  try {
    return await autoSignIn(email, password);
  } catch (error) {
    console.error('❌ Sign-in/sign-up failed:', error);
    throw error;
  }
};

/**
 * Create account if doesn't exist, then sign in
 */
export const ensureAccountAndSignIn = async (email: string, password: string) => {
  return await autoSignIn(email, password);
};