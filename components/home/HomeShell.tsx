import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground, colors } from '../ui';
import { FeedScreen } from './FeedScreen';
import { CalendarScreen } from './CalendarScreen';
import { MealRecord } from '../../types/meal';

interface HomeShellProps {
  onStartMeal: () => void;
  onOpenMeal: (meal: MealRecord) => void;
}

type Tab = 'feed' | 'calendar';

/** Home container: Feed / Calendar tabs, a floating "+" to start a new meal. */
export const HomeShell: React.FC<HomeShellProps> = ({ onStartMeal, onOpenMeal }) => {
  const [tab, setTab] = useState<Tab>('feed');

  return (
    <View className="flex-1">
      <GradientBackground height={180} />
      <StatusBar barStyle="dark-content" />
      <SafeAreaView className="flex-1" edges={['top']}>
        {tab === 'feed' ? (
          <FeedScreen onOpenMeal={onOpenMeal} />
        ) : (
          <CalendarScreen onOpenMeal={onOpenMeal} />
        )}
      </SafeAreaView>

      {/* Floating new-meal button */}
      <TouchableOpacity
        onPress={onStartMeal}
        activeOpacity={0.9}
        className="absolute items-center justify-center rounded-full"
        style={{
          right: 22,
          bottom: 104,
          width: 60,
          height: 60,
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
          shadowOpacity: 0.4,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}>
        <Ionicons name="add" size={32} color={colors.white} />
      </TouchableOpacity>

      {/* Bottom tab bar */}
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-0 right-0 items-center">
        <View
          className="mb-3 flex-row items-center"
          style={{
            backgroundColor: '#1B2230',
            borderRadius: 999,
            paddingVertical: 8,
            paddingHorizontal: 8,
            gap: 4,
          }}>
          <TabButton
            label="Feed"
            icon="albums-outline"
            active={tab === 'feed'}
            onPress={() => setTab('feed')}
          />
          <TabButton
            label="Calendar"
            icon="calendar-outline"
            active={tab === 'calendar'}
            onPress={() => setTab('calendar')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

const TabButton: React.FC<{
  label: string;
  icon: any;
  active: boolean;
  onPress: () => void;
}> = ({ label, icon, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    className="flex-row items-center"
    style={{
      backgroundColor: active ? colors.primary : 'transparent',
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 18,
      gap: 8,
    }}>
    <Ionicons name={icon} size={18} color={active ? colors.white : '#8A93A6'} />
    <Text style={{ color: active ? colors.white : '#8A93A6', fontWeight: '600', fontSize: 14 }}>
      {label}
    </Text>
  </TouchableOpacity>
);
