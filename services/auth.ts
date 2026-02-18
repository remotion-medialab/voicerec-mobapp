import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  lastActive: Date;
  condition?: 'A' | 'B' | 'C';
}

export const signUpWithEmailAndPassword = async (
  email: string,
  password: string,
  displayName?: string
): Promise<User> => {
  // Ultra-simple: just use signInWithEmail which auto-creates
  return await signInWithEmail(email, password);
};

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    console.log('🔐 Auto sign-in/create for:', email);

    // Ultra-simple: try sign-in, if user doesn't exist, auto-create
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Existing user signed in:', result.user.uid);
      return result.user;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log('👤 User not found, auto-creating account...');

        // Auto-create account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Create profile
        const profile: UserProfile = {
          uid: userCredential.user.uid,
          email: userCredential.user.email || email,
          displayName: email.split('@')[0],
          createdAt: new Date(),
          lastActive: new Date(),
        };

        await setDoc(doc(db, 'users', userCredential.user.uid), profile);
        console.log('✅ Account auto-created and user signed in');

        return userCredential.user;
      }

      // Re-throw other errors
      throw error;
    }
  } catch (error) {
    console.error('❌ Auto sign-in/create failed:', error);
    throw error;
  }
};

export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
    console.log('✅ User signed out');
  } catch (error) {
    console.error('❌ Error signing out:', error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));

    if (docSnap.exists()) {
      const data = docSnap.data() as UserProfile;

      setDoc(doc(db, 'users', uid), { lastActive: new Date() }, { merge: true }).catch((error) =>
        console.warn('⚠️ Failed to update last active:', error)
      );

      return data;
    }

    return {
      uid,
      email: auth.currentUser?.email || `user-${uid}`,
      createdAt: new Date(),
      lastActive: new Date(),
    };
  } catch (error) {
    console.warn('⚠️ Failed to get user profile:', error);
    return {
      uid,
      email: `user-${uid}`,
      createdAt: new Date(),
      lastActive: new Date(),
    };
  }
};

/**
 * Automatic account creation for unregistered users
 */
export const createAutomaticAccount = async () => {
  try {
    console.log('🔄 Creating automatic account for unregistered user...');

    const result = await signInAnonymously(auth);
    const user = result.user;

    console.log('✅ Automatic account created:', user.uid);

    // Create user profile
    const profile: UserProfile = {
      uid: user.uid,
      email: `user-${user.uid.slice(0, 8)}@temp.local`,
      displayName: `User ${user.uid.slice(0, 6)}`,
      createdAt: new Date(),
      lastActive: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), profile);
    console.log('✅ User profile created in Firestore');

    return user;
  } catch (error) {
    console.error('❌ Failed to create automatic account:', error);
    throw error;
  }
};

/**
 * Ensure user has an account (creates if doesn't exist)
 */
export const ensureUserAccount = async () => {
  try {
    if (!auth.currentUser) {
      console.log('🔄 No user logged in, creating automatic account...');
      return await createAutomaticAccount();
    }

    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      console.log('🔄 User exists but no profile, creating...');

      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || `user-${user.uid.slice(0, 8)}@temp.local`,
        displayName: user.displayName || `User ${user.uid.slice(0, 6)}`,
        createdAt: new Date(),
        lastActive: new Date(),
      };

      await setDoc(doc(db, 'users', user.uid), profile);
      console.log('✅ User profile created');
    }

    return user;
  } catch (error) {
    console.error('❌ Failed to ensure user account:', error);
    throw error;
  }
};

/**
 * Initialize automatic account creation
 */
export const initializeAutoAccount = () => {
  console.log('🔧 Initializing automatic account system');

  // Ensure user has account on app start
  ensureUserAccount().catch((error) => {
    console.error('❌ Failed to initialize account:', error);
  });

  // Listen for auth state changes
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      await ensureUserAccount();
    }
  });
};

export const subscribeToAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
