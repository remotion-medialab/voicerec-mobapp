import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from './GradientBackground';
import { ScreenHeader } from './ScreenHeader';

interface FlowScreenProps {
  onBack?: () => void;
  step?: string;
  /** Pinned footer (typically a PrimaryButton). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Standard MealBody flow layout: gradient wash, circular back + step indicator,
 * scrollable body, and a pinned footer button. Used by every onboarding /
 * pre-meal / post-meal screen for consistent chrome.
 */
export const FlowScreen: React.FC<FlowScreenProps> = ({ onBack, step, footer, children }) => (
  <View className="flex-1">
    <GradientBackground />
    <StatusBar barStyle="dark-content" />
    <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader onBack={onBack} step={step} />
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer ? <View className="px-6 pb-2 pt-2">{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </View>
);
