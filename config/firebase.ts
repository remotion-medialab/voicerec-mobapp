import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDJUOXGl3kX0_bJu7ebjTRhPhyhK3BIlYA',
  authDomain: 'reself-noregrets.firebaseapp.com',
  projectId: 'reself-noregrets',
  storageBucket: 'reself-noregrets.firebasestorage.app',
  messagingSenderId: '1035227524394',
  appId: '1:1035227524394:web:e23ca4fc11d052d1e74253',
  measurementId: 'G-EH1MSLTF3N',
};

const app = initializeApp(firebaseConfig);

// Firebase v11 handles persistence automatically in React Native
export const auth = getAuth(app);
export const db = getFirestore(app, 'mobapp'); // Connect to your specific database ID
export const storage = getStorage(app);

export default app;
