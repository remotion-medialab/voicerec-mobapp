import React, { useState } from 'react';
import { View } from 'react-native';
import { FlowScreen, Kicker, Title, GroupLabel, RatingSlider, PrimaryButton, colors } from '../ui';
import { NoteInput } from '../ui/NoteInput';
import { savePrediction } from '../../services/meals';

interface PredictionScreenProps {
  mealId: string;
  mealText: string;
  onNext: () => void;
  onBack: () => void;
}

/** Screen 7 — pre-meal prediction (3 sliders). Writes UserPrediction. */
export const PredictionScreen: React.FC<PredictionScreenProps> = ({
  mealId,
  mealText,
  onNext,
  onBack,
}) => {
  const [note, setNote] = useState('');
  const [fullness, setFullness] = useState(5);
  const [energy, setEnergy] = useState(7);
  const [satisfaction, setSatisfaction] = useState(8);
  const [saving, setSaving] = useState(false);

  const lockIn = async () => {
    setSaving(true);
    try {
      await savePrediction({
        meal_id: mealId,
        pre_meal_note: note.trim() || undefined,
        predicted_fullness: fullness,
        predicted_energy: energy,
        predicted_satisfaction: satisfaction,
      });
    } catch (e) {
      console.error('Failed to save prediction:', e);
    } finally {
      setSaving(false);
    }
    onNext();
  };

  return (
    <FlowScreen
      onBack={onBack}
      step="Decided · predict"
      footer={<PrimaryButton label="Lock it in" onPress={lockIn} loading={saving} />}>
      <Kicker style={{ marginTop: 8 }}>YOU CHOSE · {mealText.toUpperCase()}</Kicker>
      <Title style={{ marginTop: 8 }}>How will it{'\n'}land?</Title>

      <GroupLabel style={{ marginTop: 22 }}>ANYTHING ON YOUR MIND? · OPTIONAL</GroupLabel>
      <View className="mt-3">
        <NoteInput
          value={note}
          onChangeText={setNote}
          placeholder="e.g. hoping it keeps me full till dinner…"
        />
      </View>

      {/* Prediction card */}
      <View
        className="mt-6"
        style={{
          backgroundColor: colors.white,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 20,
          padding: 18,
          gap: 22,
        }}>
        <GroupLabel style={{ color: colors.primary }}>+ PREDICT · 30 MIN FROM NOW</GroupLabel>
        <RatingSlider
          label="FULLNESS"
          minLabel="LIGHT"
          maxLabel="HEAVY"
          value={fullness}
          onChange={setFullness}
          showValue
        />
        <RatingSlider
          label="ENERGY"
          minLabel="DRAINED"
          maxLabel="ENERGIZED"
          value={energy}
          onChange={setEnergy}
          showValue
        />
        <RatingSlider
          label="SATISFACTION"
          minLabel="REGRET"
          maxLabel="HAPPY"
          value={satisfaction}
          onChange={setSatisfaction}
          showValue
        />
      </View>
    </FlowScreen>
  );
};
