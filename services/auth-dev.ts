import { signInAnonymously } from 'firebase/auth';
import { auth } from '../config/firebase';

// Development authentication bypass
export const signInWithEmail = async (email: string, password: string) => {
  console.log('🔧 Development mode: using anonymous auth');
  
  // For development, skip email auth and use anonymous
  const result = await signInAnonymously(auth);
  console.log('✅ Signed in anonymously:', result.user.uid);
  return result.user;
};

export const signUpWithEmailAndPassword = async (email: string, password: string, displayName?: string) => {
  console.log('🔧 Development mode: using anonymous auth');
  
  // For development, skip email auth and use anonymous
  const result = await signInAnonymously(auth);
  console.log('✅ Created anonymous account:', result.user.uid);
  return result.user;
};