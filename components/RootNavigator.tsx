import React, { useState } from 'react';
import { HomeShell } from './home/HomeShell';
import { MealFlow } from './meal/MealFlow';
import { EditMealScreen } from './meal/EditMealScreen';

type Route = 'home' | 'meal' | 'edit';

/** Top-level navigation for an authenticated, onboarded user. */
export const RootNavigator: React.FC = () => {
  const [route, setRoute] = useState<Route>('home');
  const [editMealId, setEditMealId] = useState<string | null>(null);
  // Bumped whenever we return to home so the feed/calendar re-reads Firestore.
  const [homeKey, setHomeKey] = useState(0);

  const goHome = () => {
    setHomeKey((k) => k + 1);
    setRoute('home');
  };

  switch (route) {
    case 'meal':
      return <MealFlow onExit={goHome} />;

    case 'edit':
      return editMealId ? <EditMealScreen mealId={editMealId} onClose={goHome} /> : null;

    case 'home':
    default:
      return (
        <HomeShell
          key={homeKey}
          onStartMeal={() => setRoute('meal')}
          onOpenMeal={(id) => {
            setEditMealId(id);
            setRoute('edit');
          }}
        />
      );
  }
};
