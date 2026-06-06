import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FoodEntry, UserFoodProfile } from '../types/food';
import { getFoodEntries, getFoodProfile } from '../services/food';
import { useAuth } from './AuthContext';

interface FoodContextType {
  entries: FoodEntry[];
  foodProfile: UserFoodProfile | null;
  loading: boolean;
  refreshEntries: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setFoodProfile: (profile: UserFoodProfile) => void;
}

const FoodContext = createContext<FoodContextType | null>(null);

export function FoodProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [foodProfile, setFoodProfile] = useState<UserFoodProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshEntries = useCallback(async () => {
    if (!user) return;
    const data = await getFoodEntries(user.uid);
    setEntries(data);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profile = await getFoodProfile(user.uid);
    setFoodProfile(profile);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([refreshEntries(), refreshProfile()]).finally(() => setLoading(false));
  }, [user, refreshEntries, refreshProfile]);

  return (
    <FoodContext.Provider
      value={{ entries, foodProfile, loading, refreshEntries, refreshProfile, setFoodProfile }}>
      {children}
    </FoodContext.Provider>
  );
}

export function useFood() {
  const ctx = useContext(FoodContext);
  if (!ctx) throw new Error('useFood must be used within FoodProvider');
  return ctx;
}
