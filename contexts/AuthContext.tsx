import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthState, getUserProfile, UserProfile } from '../services/auth';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  error: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Firebase connection timeout - continuing in offline mode');
      // Don't set error, just continue with loading false
      setLoading(false);
    }, 10000); // Increased timeout to 10 seconds

    try {
      const unsubscribe = subscribeToAuthState(async (authUser) => {
        clearTimeout(timeoutId);
        setUser(authUser);

        if (authUser) {
          try {
            const profile = await getUserProfile(authUser.uid);
            setUserProfile(profile);
          } catch (err) {
            console.error('Error fetching user profile:', err);
            // Don't set error, continue with null profile
            // The app can still function without the Firestore profile
          }
        } else {
          setUserProfile(null);
        }

        // Always set loading to false after auth state is determined
        setLoading(false);
      });

      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Error setting up auth listener:', err);
      setError('Failed to initialize authentication');
      setLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
