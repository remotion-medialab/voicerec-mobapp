import React, { useState } from 'react';
import { Alert, ActivityIndicator, View } from 'react-native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { saveMealLog } from '../services/mealLogService';
import { HomeScreen } from './HomeScreen';
import { SettingsScreen } from './SettingsScreen';
// Condition A
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

  const condition = userProfile?.condition;

  const handleLogMeal = () => {
    if (condition === 'A') {
      setCurrentScreen('meal-photo');
    } else if (condition === 'B') {
      setCurrentScreen('mode-selection');
    } else {
      // No condition assigned — default to meal photo
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

      setMealSavedData({ calories: mealPhotoData.calories, mealType: details.mealType });
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

  switch (currentScreen) {
    case 'home':
      return (
        <HomeScreen
          onLogMeal={handleLogMeal}
          onViewHistory={handleViewHistory}
          onSettings={() => setCurrentScreen('settings')}
        />
      );

    case 'meal-photo':
      return (
        <MealPhotoScreen onBack={() => setCurrentScreen('home')} onNext={handleMealPhotoNext} />
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
          onSave={() => {
            setRecipeResult(null);
            setMenuResult(null);
            setCurrentScreen('home');
          }}
        />
      ) : mealMode === 'eat_out' && menuResult ? (
        <RecommendationScreen
          result={menuResult}
          mode="eat_out"
          onBack={() => setCurrentScreen('eat-out')}
          onSave={() => {
            setRecipeResult(null);
            setMenuResult(null);
            setCurrentScreen('home');
          }}
        />
      ) : null;

    case 'recommendation-history':
      return <RecommendationHistoryScreen onBack={() => setCurrentScreen('home')} />;

    case 'settings':
      return <SettingsScreen onBack={() => setCurrentScreen('home')} />;

    default:
      return (
        <HomeScreen
          onLogMeal={handleLogMeal}
          onViewHistory={handleViewHistory}
          onSettings={() => setCurrentScreen('settings')}
        />
      );
  }
};
