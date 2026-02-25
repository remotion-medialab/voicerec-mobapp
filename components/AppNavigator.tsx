import React, { useState, useEffect } from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { saveMealLog } from '../services/mealLogService';
import { createMealSession, updateMealSession, getMealSessions } from '../services/mealSessionService';
import { MealSession } from '../types/mealSession';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';
// Condition A (also shared post-meal flow)
import { MealPhotoScreen } from './conditionA/MealPhotoScreen';
import { MealDetailsScreen, MealDetailsForm } from './conditionA/MealDetailsScreen';
import { MealLoggedScreen } from './conditionA/MealLoggedScreen';
import { MealHistoryScreen } from './conditionA/MealHistoryScreen';
// Condition B
import { ModeSelectionScreen } from './conditionB/ModeSelectionScreen';
import { CookAtHomeScreen, RecipeResult } from './conditionB/CookAtHomeScreen';
import { EatOutScreen, MenuResult } from './conditionB/EatOutScreen';
import { RecommendationScreen } from './conditionB/RecommendationScreen';
import { RecommendationHistoryScreen } from './conditionB/RecommendationHistoryScreen';
import { MealsInProgressScreen } from './conditionB/MealsInProgressScreen';
import { MealMode } from '../types/recommendationLog';

type Screen =
  | 'home'
  | 'meal-photo'
  | 'meal-details'
  | 'meal-logged'
  | 'meal-history'
  | 'mode-selection'
  | 'cook-at-home'
  | 'eat-out'
  | 'recommendation'
  | 'recommendation-history'
  | 'meals-in-progress'
  | 'settings';

interface MealPhotoData {
  imageUri: string;
  imageBase64: string;
  mediaType: string;
  calories: number;
  breakdown: string;
}

interface MealSavedData {
  calories: number;
  mealType: string;
}

export const AppNavigator: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [mealPhotoData, setMealPhotoData] = useState<MealPhotoData | null>(null);
  const [mealSavedData, setMealSavedData] = useState<MealSavedData | null>(null);
  const [recipeResult, setRecipeResult] = useState<RecipeResult | null>(null);
  const [menuResult, setMenuResult] = useState<MenuResult | null>(null);
  const [mealMode, setMealMode] = useState<MealMode>('cook_at_home');
  const [uploadingMeal, setUploadingMeal] = useState(false);
  // Set when entering meal-photo after a Condition B recommendation
  const [pendingMealSessionId, setPendingMealSessionId] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [inProgressCount, setInProgressCount] = useState(0);

  const condition = userProfile?.condition;

  // Refresh in-progress count whenever we land on home
  useEffect(() => {
    if (condition === 'B' && user && currentScreen === 'home') {
      getMealSessions(user.uid, 'awaiting_post_meal_log')
        .then((sessions) => setInProgressCount(sessions.length))
        .catch(() => {});
    }
  }, [condition, user, currentScreen]);

  const handleLogMeal = () => {
    if (condition === 'B') {
      setCurrentScreen('mode-selection');
    } else {
      setCurrentScreen('meal-photo');
    }
  };

  const handleViewHistory = () => {
    if (condition === 'B') {
      setCurrentScreen('recommendation-history');
    } else {
      setCurrentScreen('meal-history');
    }
  };

  const handleMealPhotoNext = (
    imageUri: string,
    imageBase64: string,
    mediaType: string,
    calories: number,
    breakdown: string
  ) => {
    setMealPhotoData({ imageUri, imageBase64, mediaType, calories, breakdown });
    setCurrentScreen('meal-details');
  };

  const buildSessionPayload = (
    result: RecipeResult | MenuResult,
    mode: MealMode
  ): Omit<MealSession, 'id'> => {
    const isRecipe = 'steps' in result;
    const now = new Date();
    return {
      userId: user!.uid,
      mode,
      status: 'awaiting_post_meal_log',
      mealIntention: result.intention,
      linkedGoal: userProfile?.dietGoal || '',
      recommendationText: isRecipe
        ? (result as RecipeResult).dish
        : (result as MenuResult).items.join(', '),
      recommendationRationale: result.rationale,
      recommendationMetadata: isRecipe
        ? {
            dish: (result as RecipeResult).dish,
            steps: (result as RecipeResult).steps,
          }
        : {
            items: (result as MenuResult).items,
            alternatives: (result as MenuResult).alternatives,
          },
      ...(isRecipe
        ? { ingredientsText: (result as RecipeResult).ingredients }
        : { menuImageUrl: (result as MenuResult).menuImageUrl }),
      createdAt: now,
      updatedAt: now,
    };
  };

  const handleLogNow = async () => {
    if (!user) return;
    const result = mealMode === 'cook_at_home' ? recipeResult : menuResult;
    if (!result) return;
    setSavingSession(true);
    try {
      const payload = buildSessionPayload(result, mealMode);
      const id = await createMealSession(payload);
      setPendingMealSessionId(id);
      setMealPhotoData(null);
      setCurrentScreen('meal-photo');
    } catch (err) {
      console.error('Failed to create meal session:', err);
      Alert.alert('Error', 'Could not save session. Please try again.');
    } finally {
      setSavingSession(false);
    }
  };

  const handleSaveForLater = async () => {
    if (!user) return;
    const result = mealMode === 'cook_at_home' ? recipeResult : menuResult;
    if (!result) return;
    setSavingSession(true);
    try {
      const payload = buildSessionPayload(result, mealMode);
      await createMealSession(payload);
      setRecipeResult(null);
      setMenuResult(null);
      setCurrentScreen('meals-in-progress');
    } catch (err) {
      console.error('Failed to save meal session:', err);
      Alert.alert('Error', 'Could not save session. Please try again.');
    } finally {
      setSavingSession(false);
    }
  };

  const handleResumeSession = (session: MealSession) => {
    setPendingMealSessionId(session.id || null);
    setMealPhotoData(null);
    setCurrentScreen('meal-photo');
  };

  const handleMealDetailsSave = async (details: MealDetailsForm) => {
    if (!user || !mealPhotoData) return;
    setUploadingMeal(true);
    try {
      const filename = `mealImages/${user.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      const response = await fetch(mealPhotoData.imageUri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const imageUrl = await getDownloadURL(storageRef);

      if (pendingMealSessionId) {
        // Condition B path: complete the MealSession
        await updateMealSession(user.uid, pendingMealSessionId, {
          actualMealPhotoUrl: imageUrl,
          estimatedCalories: mealPhotoData.calories,
          calorieBreakdown: mealPhotoData.breakdown,
          mealType: details.mealType,
          feelingAfterEating: details.feelingAfterEating,
          bodyResponseAfterEating: details.bodyResponseAfterEating,
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        // Condition A path: save mealLog (unchanged)
        await saveMealLog({
          userId: user.uid,
          imageUrl,
          estimatedCalories: mealPhotoData.calories,
          calorieBreakdown: mealPhotoData.breakdown,
          mealType: details.mealType,
          feelingAfterEating: details.feelingAfterEating,
          bodyResponseAfterEating: details.bodyResponseAfterEating,
          linkedGoal: userProfile?.dietGoal || '',
          timestamp: new Date(),
        });
      }

      setMealSavedData({ calories: mealPhotoData.calories, mealType: details.mealType });
      setPendingMealSessionId(null);
      setCurrentScreen('meal-logged');
    } catch (err) {
      console.error('Failed to save meal:', err);
      Alert.alert('Error', 'Could not save meal. Please try again.');
    } finally {
      setUploadingMeal(false);
    }
  };

  if (uploadingMeal) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Condition B post-recommendation: show "log what you actually ate" intro
  const postRecommendationIntro = pendingMealSessionId
    ? {
        title: 'Log What You Actually Ate',
        subtitle: 'Take a photo of the meal you ended up eating so we can track your actual intake.',
      }
    : undefined;

  switch (currentScreen) {
    case 'home':
      return (
        <HomeScreen
          onLogMeal={handleLogMeal}
          onViewHistory={handleViewHistory}
          onSettings={() => setCurrentScreen('settings')}
          onMealsInProgress={() => setCurrentScreen('meals-in-progress')}
          mealSessionCount={inProgressCount}
        />
      );

    case 'meal-photo':
      return (
        <MealPhotoScreen
          intro={postRecommendationIntro}
          onBack={() => {
            setPendingMealSessionId(null);
            setCurrentScreen('home');
          }}
          onNext={handleMealPhotoNext}
        />
      );

    case 'meal-details':
      return mealPhotoData ? (
        <MealDetailsScreen
          imageUri={mealPhotoData.imageUri}
          estimatedCalories={mealPhotoData.calories}
          onBack={() => setCurrentScreen('meal-photo')}
          onSave={handleMealDetailsSave}
        />
      ) : null;

    case 'meal-logged':
      return mealSavedData ? (
        <MealLoggedScreen
          calories={mealSavedData.calories}
          mealType={mealSavedData.mealType}
          onDone={() => {
            setMealPhotoData(null);
            setMealSavedData(null);
            setCurrentScreen('home');
          }}
        />
      ) : null;

    case 'meal-history':
      return <MealHistoryScreen onBack={() => setCurrentScreen('home')} />;

    case 'mode-selection':
      return (
        <ModeSelectionScreen
          onBack={() => setCurrentScreen('home')}
          onCookAtHome={() => setCurrentScreen('cook-at-home')}
          onEatOut={() => setCurrentScreen('eat-out')}
        />
      );

    case 'cook-at-home':
      return (
        <CookAtHomeScreen
          onBack={() => setCurrentScreen('mode-selection')}
          onRecommendation={(result) => {
            setRecipeResult(result);
            setMealMode('cook_at_home');
            setCurrentScreen('recommendation');
          }}
        />
      );

    case 'eat-out':
      return (
        <EatOutScreen
          onBack={() => setCurrentScreen('mode-selection')}
          onRecommendation={(result) => {
            setMenuResult(result);
            setMealMode('eat_out');
            setCurrentScreen('recommendation');
          }}
        />
      );

    case 'recommendation':
      return mealMode === 'cook_at_home' && recipeResult ? (
        <RecommendationScreen
          result={recipeResult}
          mode="cook_at_home"
          onBack={() => setCurrentScreen('cook-at-home')}
          onLogNow={handleLogNow}
          onSaveForLater={handleSaveForLater}
          saving={savingSession}
        />
      ) : mealMode === 'eat_out' && menuResult ? (
        <RecommendationScreen
          result={menuResult}
          mode="eat_out"
          onBack={() => setCurrentScreen('eat-out')}
          onLogNow={handleLogNow}
          onSaveForLater={handleSaveForLater}
          saving={savingSession}
        />
      ) : null;

    case 'recommendation-history':
      return <RecommendationHistoryScreen onBack={() => setCurrentScreen('home')} />;

    case 'meals-in-progress':
      return (
        <MealsInProgressScreen
          onBack={() => setCurrentScreen('home')}
          onResume={handleResumeSession}
        />
      );

    case 'settings':
      return <SettingsScreen onBack={() => setCurrentScreen('home')} />;

    default:
      return (
        <HomeScreen
          onLogMeal={handleLogMeal}
          onViewHistory={handleViewHistory}
          onSettings={() => setCurrentScreen('settings')}
          onMealsInProgress={() => setCurrentScreen('meals-in-progress')}
          mealSessionCount={inProgressCount}
        />
      );
  }
};
