import React, { useState } from 'react';
import { View, Text } from 'react-native';
import {
  FlowScreen,
  Kicker,
  Title,
  GroupLabel,
  RatingSlider,
  PortionSelector,
  PrimaryButton,
  colors,
} from '../ui';
import { MealPill } from './MealPill';
import { saveActualOutcomes } from '../../services/meals';
import { PortionEaten } from '../../types/meal';

interface ActualScreenProps {
  mealId: string;
  mealText: string;
  onNext: () => void;
  onBack: () => void;
}

/** Screen 10 — portion eaten + actual fullness/energy/satisfaction. */
export const ActualScreen: React.FC<ActualScreenProps> = ({ mealId, mealText, onNext, onBack }) => {
  const [portion, setPortion] = useState<string | null>(null);
  const [fullness, setFullness] = useState(6);
  const [energy, setEnergy] = useState(5);
  const [satisfaction, setSatisfaction] = useState(7);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!portion) return;
    setSaving(true);
    try {
      await saveActualOutcomes({
        meal_id: mealId,
        portion_eaten: portion as PortionEaten,
        actual_fullness: fullness,
        actual_energy: energy,
        actual_satisfaction: satisfaction,
      });
    } catch (e) {
      console.error('Failed to save actual outcomes:', e);
    } finally {
      setSaving(false);
    }
    onNext();
  };

  return (
    <FlowScreen
      onBack={onBack}
      step="+30 min · 1 of 4"
      footer={
        <PrimaryButton label="See the gap" onPress={save} loading={saving} disabled={!portion} />
      }>
      <Kicker style={{ marginTop: 8 }}>POST-MEAL · ACTUAL</Kicker>
      <Title style={{ marginTop: 8 }}>How are you{'\n'}actually?</Title>
      <View className="mt-3">
        <MealPill mealText={mealText} />
      </View>

      <GroupLabel style={{ marginTop: 22 }}>HOW MUCH DID YOU EAT?</GroupLabel>
      <View className="mt-3">
        <PortionSelector value={portion} onChange={setPortion} />
      </View>

      <View className="mt-7" style={{ gap: 22 }}>
        <RatingSlider
          label="FULLNESS"
          minLabel="LIGHT"
          maxLabel="HEAVY"
          value={fullness}
          onChange={setFullness}
        />
        <RatingSlider
          label="ENERGY"
          minLabel="DRAINED"
          maxLabel="ENERGIZED"
          value={energy}
          onChange={setEnergy}
        />
        <RatingSlider
          label="SATISFACTION"
          minLabel="REGRET"
          maxLabel="HAPPY"
          value={satisfaction}
          onChange={setSatisfaction}
        />
      </View>
      <Text style={{ height: 4, color: colors.white }} />
    </FlowScreen>
  );
};
