import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  FlowScreen,
  Kicker,
  Title,
  GroupLabel,
  Chip,
  ChipGroup,
  RatingSlider,
  PrimaryButton,
  colors,
} from '../ui';
import { EATING_REASONS, CRAVINGS } from '../mealOptions';
import { PreMealMoodInput } from '../../types/meal';

interface MoodScreenProps {
  /** Controlled selections — owned by LogMealFlow so they survive navigation. */
  value: PreMealMoodInput;
  onChange: (patch: Partial<PreMealMoodInput>) => void;
  /** "Decide with AI MealChef" → opens the companion chat (Screen 6). */
  onDecideWithAI: () => void;
  /** "I already have something in mind" → skips straight to logging (Screen 7). */
  onHaveInMind: () => void;
  onBack: () => void;
}

function clock(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Screen 5 — entry to the meal-log flow. Captures the pre-meal mood, then
 * branches: chat with the AI companion to decide, or skip ahead to logging.
 * Fully controlled; the mood is persisted once the meal is logged (Screen 7).
 */
export const MoodScreen: React.FC<MoodScreenProps> = ({
  value,
  onChange,
  onDecideWithAI,
  onHaveInMind,
  onBack,
}) => {
  const reason = value.eating_reason ?? null;
  const hunger = value.current_hunger ?? 6;
  const targetFullness = value.target_fullness ?? 6;
  const cravings = value.cravings ?? [];

  return (
    <FlowScreen
      onBack={onBack}
      step="lunch · deciding"
      footer={
        <View style={{ gap: 6 }}>
          <PrimaryButton label="Decide with AI MealChef" onPress={onDecideWithAI} arrow={false} />
          <TouchableOpacity
            className="items-center py-3"
            activeOpacity={0.7}
            onPress={onHaveInMind}>
            <Text style={{ color: colors.subtle, fontSize: 14 }}>
              I already have something in mind →
            </Text>
          </TouchableOpacity>
        </View>
      }>
      <Kicker style={{ marginTop: 8 }}>BEFORE YOU CHOOSE</Kicker>
      <Title style={{ marginTop: 8 }}>What are you{'\n'}in the mood for?</Title>
      <Text style={{ color: colors.kicker, fontSize: 12, marginTop: 8 }}>Now · {clock()}</Text>

      {/* Voice box (text-only) */}
      <View
        className="mt-5 flex-row items-center"
        style={{
          backgroundColor: colors.white,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 10,
          gap: 12,
        }}>
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.primary }}>
          <Ionicons name="mic" size={18} color={colors.white} />
        </View>
        <TextInput
          value={value.voice_input ?? ''}
          onChangeText={(t) => onChange({ voice_input: t })}
          placeholder="Hold to say how you feel right now"
          placeholderTextColor={colors.kicker}
          style={{ flex: 1, color: colors.ink, fontSize: 15, paddingVertical: 6 }}
        />
      </View>

      <GroupLabel style={{ marginTop: 24 }}>WHY ARE YOU EATING RIGHT NOW?</GroupLabel>
      <View className="mt-3 flex-row flex-wrap" style={{ gap: 10 }}>
        {EATING_REASONS.map((r) => (
          <Chip
            key={r}
            label={r}
            selected={reason === r}
            onPress={() => onChange({ eating_reason: reason === r ? undefined : r })}
            variant="blue"
          />
        ))}
      </View>

      <View className="mt-7" style={{ gap: 22 }}>
        <RatingSlider
          label="HOW HUNGRY, IN YOUR BODY?"
          minLabel="NOT REALLY"
          maxLabel="STARVING"
          value={hunger}
          onChange={(v) => onChange({ current_hunger: v })}
          showValue
        />
        <RatingSlider
          label="HOW FULL DO YOU WANT TO FEEL AFTER?"
          minLabel="JUST ENOUGH"
          maxLabel="VERY FULL"
          value={targetFullness}
          onChange={(v) => onChange({ target_fullness: v })}
        />
      </View>

      <GroupLabel style={{ marginTop: 24 }}>CRAVING ANYTHING IN PARTICULAR?</GroupLabel>
      <View className="mt-3">
        <ChipGroup
          options={CRAVINGS}
          value={cravings}
          onChange={(next) => onChange({ cravings: next })}
          variant="blue"
        />
      </View>
    </FlowScreen>
  );
};
