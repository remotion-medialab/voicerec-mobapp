import React, { useState } from 'react';
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
import { savePreMealMood } from '../../services/meals';

interface MoodScreenProps {
  onNext: () => void;
  onBack: () => void;
}

function clock(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Screen 5 — pre-meal mood, hunger/target sliders, cravings. Writes PreMealMood. */
export const MoodScreen: React.FC<MoodScreenProps> = ({ onNext, onBack }) => {
  const [voiceInput, setVoiceInput] = useState('');
  const [reason, setReason] = useState<string | null>(null);
  const [hunger, setHunger] = useState(6);
  const [targetFullness, setTargetFullness] = useState(6);
  const [cravings, setCravings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const proceed = async () => {
    setSaving(true);
    try {
      await savePreMealMood({
        voice_input: voiceInput.trim() || undefined,
        eating_reason: reason ?? undefined,
        current_hunger: hunger,
        target_fullness: targetFullness,
        cravings,
      });
    } catch (e) {
      console.error('Failed to save mood:', e);
    } finally {
      setSaving(false);
    }
    onNext();
  };

  return (
    <FlowScreen
      onBack={onBack}
      step={`lunch · deciding`}
      footer={
        <View style={{ gap: 10 }}>
          <PrimaryButton
            label="Decide with AI MealChef"
            onPress={proceed}
            loading={saving}
            arrow={false}
          />
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
        <NoteInputInline
          value={voiceInput}
          onChangeText={setVoiceInput}
          placeholder="Say how you feel right now"
        />
      </View>

      <GroupLabel style={{ marginTop: 24 }}>WHY ARE YOU EATING RIGHT NOW?</GroupLabel>
      <View className="mt-3 flex-row flex-wrap" style={{ gap: 10 }}>
        {EATING_REASONS.map((r) => (
          <Chip
            key={r}
            label={r}
            selected={reason === r}
            onPress={() => setReason(reason === r ? null : r)}
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
          onChange={setHunger}
          showValue
        />
        <RatingSlider
          label="HOW FULL DO YOU WANT TO FEEL AFTER?"
          minLabel="JUST ENOUGH"
          maxLabel="VERY FULL"
          value={targetFullness}
          onChange={setTargetFullness}
        />
      </View>

      <GroupLabel style={{ marginTop: 24 }}>CRAVING ANYTHING IN PARTICULAR?</GroupLabel>
      <View className="mt-3">
        <ChipGroup options={CRAVINGS} value={cravings} onChange={setCravings} variant="blue" />
      </View>

      <TouchableOpacity className="mt-5 items-center" activeOpacity={0.7} onPress={proceed}>
        <Text style={{ color: colors.subtle, fontSize: 14 }}>
          I already have something in mind →
        </Text>
      </TouchableOpacity>
    </FlowScreen>
  );
};

// Inline variant of NoteInput without its own box (the box is drawn by the row).
const NoteInputInline: React.FC<{
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
}> = ({ value, onChangeText, placeholder }) => {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.kicker}
      style={{ flex: 1, color: colors.ink, fontSize: 15, paddingVertical: 6 }}
    />
  );
};
