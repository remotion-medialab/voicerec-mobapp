import {
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
}

export const signUpWithEmailAndPassword = async (email: string, password: string, displayName?: string): Promise<User> => {
  try {
    console.log('🔐 Creating account with email:', email);
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✅ Account created successfully, UID:', user.uid);

    // Create user profile
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || email,
      displayName,
      createdAt: new Date(),
      lastActive: new Date(),
    };

    // Save to Firestore (non-blocking)
    setDoc(doc(db, 'users', user.uid), userProfile)
      .then(() => console.log('✅ User profile created in Firestore'))
      .catch((error) => console.warn('⚠️ Failed to save user profile to Firestore:', error));

    return user;
  } catch (error) {
    console.error('❌ Error creating account:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  try {
    console.log('🔐 Signing in with email:', email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✅ Sign in successful, UID:', user.uid);

    // Update last active timestamp (non-blocking)
    setDoc(
      doc(db, 'users', user.uid),
      { lastActive: new Date() },
      { merge: true }
    ).catch((error) => console.warn('⚠️ Failed to update last active:', error));

    return user;
  } catch (error) {
    console.error('❌ Error signing in:', error);
    throw error;
  }
};

export const signInOrSignUp = async (email: string, password: string, displayName?: string): Promise<User> => {
  try {
    // Try to sign in first
    return await signInWithEmail(email, password);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      // User doesn't exist, create new account
      console.log('👤 User not found, creating new account');
      return await signUpWithEmailAndPassword(email, password, displayName);
    } else {
      // Other error, rethrow
      throw error;
    }
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
      
      // Update last active timestamp (non-blocking)
      setDoc(
        doc(db, 'users', uid),
        { lastActive: new Date() },
        { merge: true }
      ).catch((error) => console.warn('⚠️ Failed to update last active:', error));
      
      return data;
    }

    return null;
  } catch (error) {
    console.warn('⚠️ Failed to get user profile from Firestore:', error);
    // Return a default profile instead of throwing
    return {
      uid,
      email: auth.currentUser?.email || '',
      createdAt: new Date(),
      lastActive: new Date(),
    };
  }
};

export const subscribeToAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
