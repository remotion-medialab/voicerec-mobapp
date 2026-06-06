import React, { useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { FoodWelcomeScreen } from './FoodWelcomeScreen';
import { FoodLoginScreen } from './FoodLoginScreen';
import { AboutYouScreen } from './AboutYouScreen';
import { FavoriteCuisineScreen } from './FavoriteCuisineScreen';
import { FoodRestrictionsScreen } from './FoodRestrictionsScreen';
import { VoiceInputScreen } from './VoiceInputScreen';
import { AllSetScreen } from './AllSetScreen';
import { UserFoodProfile } from '../../../types/food';
import { signInWithEmail } from '../../../services/auth';
import { updateFoodProfile } from '../../../services/food';

type Screen =
  | 'welcome'
  | 'signup'
  | 'login'
  | 'about-you'
  | 'cuisine'
  | 'restrictions'
  | 'food-love'
  | 'food-change'
  | 'all-set';

interface Props {
  onComplete: () => void;
}

const SIGNUP_SCREENS: Screen[] = [
  'welcome',
  'signup',
  'about-you',
  'cuisine',
  'restrictions',
  'food-love',
  'food-change',
  'all-set',
];

const LOGIN_SCREENS: Screen[] = ['welcome', 'login'];

export function FoodOnboardingNavigator({ onComplete }: Props) {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [flow, setFlow] = useState<'signup' | 'login'>('signup');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Partial<UserFoodProfile>>({
    favoriteCuisines: [],
    restrictions: [],
    goals: [],
    foodLoveDescription: '',
    changeDescription: '',
  });

  const screens = flow === 'login' ? LOGIN_SCREENS : SIGNUP_SCREENS;
  const idx = screens.indexOf(screen);
  const progress = ((idx + 1) / screens.length) * 100;

  const goBack = () => {
    if (idx > 0) setScreen(screens[idx - 1]);
  };

  const handleAuth = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const user = await signInWithEmail(email, password);
      if (flow === 'login') {
        onComplete();
      } else {
        // Save partial profile so next screens can update it
        setDraft((prev) => ({ ...prev, uid: user.uid }));
        setScreen('about-you');
      }
    } catch (e: any) {
      let msg = 'Something went wrong. Please try again.';
      if (e.code === 'auth/invalid-email') msg = 'Invalid email address.';
      else if (e.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
      else if (e.code === 'auth/email-already-in-use') msg = 'Account already exists. Try logging in.';
      else if (e.code === 'auth/invalid-credential') msg = 'Wrong email or password.';
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAllSet = async () => {
    if (!draft.uid) return;
    const profile: UserFoodProfile = {
      uid: draft.uid,
      favoriteCuisines: draft.favoriteCuisines ?? [],
      restrictions: draft.restrictions ?? [],
      goals: draft.goals ?? [],
      foodLoveDescription: draft.foodLoveDescription ?? '',
      changeDescription: draft.changeDescription ?? '',
      onboardingComplete: true,
    };
    await updateFoodProfile(draft.uid, profile);
    onComplete();
  };

  if (authLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loaderText}>Setting up your journal…</Text>
      </View>
    );
  }

  switch (screen) {
    case 'welcome':
      return (
        <FoodWelcomeScreen
          onGetStarted={() => {
            setFlow('signup');
            setScreen('signup');
          }}
          onLogin={() => {
            setFlow('login');
            setScreen('login');
          }}
        />
      );

    case 'signup':
      return (
        <FoodLoginScreen
          mode="signup"
          onNext={handleAuth}
          onBack={() => setScreen('welcome')}
          loading={authLoading}
          error={authError}
        />
      );

    case 'login':
      return (
        <FoodLoginScreen
          mode="login"
          onNext={handleAuth}
          onBack={() => setScreen('welcome')}
          loading={authLoading}
          error={authError}
        />
      );

    case 'about-you':
      return (
        <AboutYouScreen
          progress={progress}
          onBack={goBack}
          onNext={(goals) => {
            setDraft((prev) => ({ ...prev, goals }));
            setScreen('cuisine');
          }}
        />
      );

    case 'cuisine':
      return (
        <FavoriteCuisineScreen
          progress={progress}
          onBack={goBack}
          onNext={(cuisines) => {
            setDraft((prev) => ({ ...prev, favoriteCuisines: cuisines }));
            setScreen('restrictions');
          }}
        />
      );

    case 'restrictions':
      return (
        <FoodRestrictionsScreen
          progress={progress}
          onBack={goBack}
          onNext={(restrictions) => {
            setDraft((prev) => ({ ...prev, restrictions }));
            setScreen('food-love');
          }}
        />
      );

    case 'food-love':
      return (
        <VoiceInputScreen
          title="Tell me about the food you love."
          subtitle="Flavors, textures, memories — anything that makes a meal special to you."
          placeholder="I love bold flavors, especially anything with garlic or chili…"
          progress={progress}
          onBack={goBack}
          onNext={(text) => {
            setDraft((prev) => ({ ...prev, foodLoveDescription: text }));
            setScreen('food-change');
          }}
        />
      );

    case 'food-change':
      return (
        <VoiceInputScreen
          title="What would you like to change about how you eat?"
          subtitle="No judgment — just what feels true right now."
          placeholder="I want to stop eating late at night and cook more at home…"
          progress={progress}
          onBack={goBack}
          onNext={(text) => {
            setDraft((prev) => ({ ...prev, changeDescription: text }));
            setScreen('all-set');
          }}
        />
      );

    case 'all-set':
      return <AllSetScreen onStart={handleAllSet} />;

    default:
      return (
        <FoodWelcomeScreen
          onGetStarted={() => setScreen('signup')}
          onLogin={() => setScreen('login')}
        />
      );
  }
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loaderText: { marginTop: 16, fontSize: 15, color: '#64748b' },
});
