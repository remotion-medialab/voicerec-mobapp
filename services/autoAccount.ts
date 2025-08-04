import { signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export interface AutoUserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  lastActive: Date;
  isAnonymous: boolean;
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

/**
 * Create an automatic account for unregistered users
 */
export const createAnonymousAccount = async () => {
  try {
    console.log('🔄 Creating automatic account for unregistered user...');
    
    const result = await signInAnonymously(auth);
    const user = result.user;
    
    console.log('✅ Anonymous account created:', user.uid);
    
    // Create user profile
    const profile: AutoUserProfile = {
      uid: user.uid,
      email: `anonymous-${user.uid.slice(0, 8)}@temp.local`,
      displayName: `User ${user.uid.slice(0, 6)}`,
      createdAt: new Date(),
      lastActive: new Date(),
      isAnonymous: true,
      deviceInfo: {
        platform: 'mobile',
        version: '1.0.0'
      }
    };

    // Save to Firestore
    await setDoc(doc(db, 'users', user.uid), profile);
    console.log('✅ User profile created in Firestore');
    
    return user;
  } catch (error) {
    console.error('❌ Failed to create anonymous account:', error);
    throw error;
  }
};

/**
 * Ensure user has an account (creates if doesn't exist)
 */
export const ensureUserAccount = async () => {
  try {
    if (!auth.currentUser) {
      console.log('🔄 No user logged in, creating anonymous account...');
      return await createAnonymousAccount();
    }
    
    const user = auth.currentUser;
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      console.log('🔄 User exists but no profile, creating...');
      
      const profile: AutoUserProfile = {
        uid: user.uid,
        email: user.email || `anonymous-${user.uid.slice(0, 8)}@temp.local`,
        displayName: user.displayName || `User ${user.uid.slice(0, 6)}`,
        createdAt: new Date(),
        lastActive: new Date(),
        isAnonymous: !user.email,
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
 * Check if user is registered (not anonymous)
 */
export const isRegisteredUser = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return false;
    
    const data = userDoc.data();
    return !data?.isAnonymous;
  } catch (error) {
    console.error('❌ Failed to check registration status:', error);
    return false;
  }
};

/**
 * Convert anonymous account to registered account
 */
export const convertToRegisteredAccount = async (email: string, password: string, displayName?: string) => {
  try {
    // This would require linking email/password to anonymous account
    // For now, create new registered account
    console.log('🔄 Converting anonymous to registered account...');
    
    // Implementation depends on your auth flow
    // This is a placeholder for when you implement real registration
    
    return auth.currentUser;
  } catch (error) {
    console.error('❌ Failed to convert account:', error);
    throw error;
  }
};