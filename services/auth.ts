import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  participantId: string;
  createdAt: Date;
  lastActive: Date;
  settings: {
    notificationsEnabled: boolean;
    autoSync: boolean;
  };
}

export const createAccount = async (
  email: string,
  password: string,
  displayName: string,
  participantId: string
): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName });

    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName,
      participantId,
      createdAt: new Date(),
      lastActive: new Date(),
      settings: {
        notificationsEnabled: true,
        autoSync: true
      }
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

    return user;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

export const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last active timestamp
    await setDoc(
      doc(db, 'users', userCredential.user.uid),
      { lastActive: new Date() },
      { merge: true }
    );

    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

export const subscribeToAuthState = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};