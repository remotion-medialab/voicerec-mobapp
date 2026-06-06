import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FoodHomeScreen } from './food/home/FoodHomeScreen';
import { MealMoodScreen } from './food/companion/MealMoodScreen';
import { MealCompanionScreen } from './food/companion/MealCompanionScreen';
import { ReflectionNavigator } from './food/reflection/ReflectionNavigator';
import { EntryDetailScreen } from './food/detail/EntryDetailScreen';
import { EditEntryScreen } from './food/detail/EditEntryScreen';
import { ProfileScreen } from './food/profile/ProfileScreen';
import { FoodEntry } from '../types/food';
import { FoodProvider } from '../contexts/FoodContext';

type Screen =
  | 'home'
  | 'profile'
  | 'meal-mood'
  | 'companion'
  | 'reflection'
  | 'entry-detail'
  | 'entry-edit';

export function FoodAppNavigator() {
  const [screen, setScreen] = useState<Screen>('home');
  const [moodText, setMoodText] = useState('');
  const [suggestedMeal, setSuggestedMeal] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const insets = useSafeAreaInsets();

  const goHome = () => {
    setScreen('home');
    setMoodText('');
    setSuggestedMeal('');
    setSelectedEntry(null);
  };

  const showTabBar = screen === 'home' || screen === 'profile';

  return (
    <FoodProvider>
      <View style={styles.root}>
        {screen === 'home' && (
          <FoodHomeScreen
            onAddMeal={() => setScreen('meal-mood')}
            onEntryPress={(entry) => {
              setSelectedEntry(entry);
              setScreen('entry-detail');
            }}
          />
        )}

        {screen === 'profile' && (
          <ProfileScreen onBack={goHome} />
        )}

        {screen === 'meal-mood' && (
          <MealMoodScreen
            onBack={goHome}
            onContinue={(text) => {
              setMoodText(text);
              setScreen('companion');
            }}
          />
        )}

        {screen === 'companion' && (
          <MealCompanionScreen
            initialMood={moodText}
            onBack={() => setScreen('meal-mood')}
            onLogMeal={(mealName) => {
              setSuggestedMeal(mealName);
              setScreen('reflection');
            }}
          />
        )}

        {screen === 'reflection' && (
          <ReflectionNavigator
            initialMealName={suggestedMeal}
            onBack={() => setScreen('companion')}
            onDone={goHome}
          />
        )}

        {screen === 'entry-detail' && selectedEntry && (
          <EntryDetailScreen
            entry={selectedEntry}
            onBack={goHome}
            onEdit={(entry) => {
              setSelectedEntry(entry);
              setScreen('entry-edit');
            }}
          />
        )}

        {screen === 'entry-edit' && selectedEntry && (
          <EditEntryScreen
            entry={selectedEntry}
            onBack={() => setScreen('entry-detail')}
            onDone={() => setScreen('entry-detail')}
          />
        )}

        {/* Bottom tab bar */}
        {showTabBar && (
          <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TabItem
              icon="home-outline"
              iconActive="home"
              label="Home"
              active={screen === 'home'}
              onPress={goHome}
            />
            <TouchableOpacity
              style={styles.addTabBtn}
              onPress={() => setScreen('meal-mood')}
              activeOpacity={0.85}>
              <Ionicons name="add" size={28} color="#ffffff" />
            </TouchableOpacity>
            <TabItem
              icon="person-outline"
              iconActive="person"
              label="Profile"
              active={screen === 'profile'}
              onPress={() => setScreen('profile')}
            />
          </View>
        )}
      </View>
    </FoodProvider>
  );
}

function TabItem({
  icon,
  iconActive,
  label,
  active,
  onPress,
}: {
  icon: string;
  iconActive: string;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}>
      <Ionicons
        name={(active ? iconActive : icon) as any}
        size={24}
        color={active ? '#6366f1' : '#94a3b8'}
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingTop: 10,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 4, gap: 3 },
  tabLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
  tabLabelActive: { color: '#6366f1' },
  addTabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
