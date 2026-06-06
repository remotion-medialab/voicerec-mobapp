import React, { useEffect, useRef, useState } from 'react';
import { HomeShell } from './home/HomeShell';
import { LogMealFlow } from './meal/LogMealFlow';
import { ImmediateReactionFlow } from './meal/ImmediateReactionFlow';
import { DelayedCheckInFlow } from './meal/DelayedCheckInFlow';
import { EditMealScreen } from './meal/EditMealScreen';
import { getMealRecord } from '../services/meals';
import {
  configureNotifications,
  addBodyCheckInResponseListener,
  getLaunchMealId,
} from '../services/notifications';
import { MealRecord } from '../types/meal';

type Route = 'home' | 'phase1' | 'phase2' | 'phase3' | 'edit';

/** Top-level navigation for an authenticated, onboarded user. */
export const RootNavigator: React.FC = () => {
  const [route, setRoute] = useState<Route>('home');
  const [meal, setMeal] = useState<{ id: string; text: string } | null>(null);
  // Bumped whenever we return to home so the feed/calendar re-reads Firestore.
  const [homeKey, setHomeKey] = useState(0);

  const goHome = () => {
    setHomeKey((k) => k + 1);
    setMeal(null);
    setRoute('home');
  };

  // Open the Phase 3 delayed check-in for a meal (used by notification taps).
  const openDelayedCheckIn = async (mealId: string) => {
    try {
      const record = await getMealRecord(mealId);
      setMeal({ id: mealId, text: record?.meal_text ?? '' });
    } catch {
      setMeal({ id: mealId, text: '' });
    }
    setRoute('phase3');
  };
  const openDelayedRef = useRef(openDelayedCheckIn);
  openDelayedRef.current = openDelayedCheckIn;

  // Notifications: foreground handler, tap listener, and cold-start deep link.
  useEffect(() => {
    configureNotifications();
    const sub = addBodyCheckInResponseListener((mealId) => openDelayedRef.current(mealId));
    getLaunchMealId().then((mealId) => {
      if (mealId) openDelayedRef.current(mealId);
    });
    return () => sub.remove();
  }, []);

  // Route a feed/calendar tap to the right phase based on the meal's status.
  const openMeal = (m: MealRecord) => {
    setMeal({ id: m.meal_id, text: m.meal_text });
    if (m.status === 'awaiting_reaction') setRoute('phase2');
    else if (m.status === 'awaiting_body') setRoute('phase3');
    else setRoute('edit');
  };

  switch (route) {
    case 'phase1':
      return <LogMealFlow onExit={goHome} />;

    case 'phase2':
      return meal ? (
        <ImmediateReactionFlow mealId={meal.id} mealText={meal.text} onExit={goHome} />
      ) : null;

    case 'phase3':
      return meal ? (
        <DelayedCheckInFlow mealId={meal.id} mealText={meal.text} onExit={goHome} />
      ) : null;

    case 'edit':
      return meal ? <EditMealScreen mealId={meal.id} onClose={goHome} /> : null;

    case 'home':
    default:
      return (
        <HomeShell key={homeKey} onStartMeal={() => setRoute('phase1')} onOpenMeal={openMeal} />
      );
  }
};
