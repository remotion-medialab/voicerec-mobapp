import React, { useState } from 'react';
import { View } from 'react-native';
import {
  FlowScreen,
  Kicker,
  Title,
  GroupLabel,
  ChipGroup,
  RatingSlider,
  FlavorWheel,
  toFlavorBreakdown,
  PrimaryButton,
  FlavorLevels,
  FLAVOR_ORDER,
} from '../ui';
import { TASTE_NOTES, TEXTURE_NOTES } from '../mealOptions';
import { saveTasteRating } from '../../services/meals';

interface TasteScreenProps {
  mealId: string;
  mealText: string;
  onNext: () => void;
  onBack: () => void;
}

/** Screen 8 — taste: flavor wheel + strength slider + taste/texture chips. */
export const TasteScreen: React.FC<TasteScreenProps> = ({ mealId, mealText, onNext, onBack }) => {
  const [flavors, setFlavors] = useState<FlavorLevels>({});
  const [strength, setStrength] = useState(5);
  const [tasteNotes, setTasteNotes] = useState<string[]>([]);
  const [textureNotes, setTextureNotes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Strongest flavor labels the strength slider, like the mockup.
  const dominant = FLAVOR_ORDER.reduce<{ f: string; v: number }>(
    (best, f) => ((flavors[f] ?? 0) > best.v ? { f, v: flavors[f] ?? 0 } : best),
    { f: 'flavor', v: 0 }
  ).f;

  const save = async () => {
    setSaving(true);
    try {
      await saveTasteRating({
        meal_id: mealId,
        flavor_breakdown: toFlavorBreakdown(flavors),
        flavor_strength: strength,
        taste_notes: tasteNotes,
        texture_notes: textureNotes,
      });
    } catch (e) {
      console.error('Failed to save taste rating:', e);
    } finally {
      setSaving(false);
    }
    onNext();
  };

  return (
    <FlowScreen
      onBack={onBack}
      step="Right after · taste"
      footer={<PrimaryButton label="Save taste" onPress={save} loading={saving} />}>
      <Kicker style={{ marginTop: 8 }}>{mealText.toUpperCase()}</Kicker>
      <Title style={{ marginTop: 8 }}>How did it{'\n'}taste?</Title>

      <View className="mt-6">
        <FlavorWheel value={flavors} onChange={setFlavors} />
      </View>

      <View className="mt-6">
        <RatingSlider
          label={`${dominant.toUpperCase()} · HOW STRONG?`}
          minLabel="MILD"
          maxLabel="INTENSE"
          value={strength}
          onChange={setStrength}
        />
      </View>

      <GroupLabel style={{ marginTop: 20 }}>TASTE NOTES</GroupLabel>
      <View className="mt-3">
        <ChipGroup
          options={TASTE_NOTES}
          value={tasteNotes}
          onChange={setTasteNotes}
          variant="dark"
        />
      </View>

      <GroupLabel style={{ marginTop: 22 }}>FEEL · MOUTH &amp; TEXTURE</GroupLabel>
      <View className="mt-3">
        <ChipGroup
          options={TEXTURE_NOTES}
          value={textureNotes}
          onChange={setTextureNotes}
          variant="dark"
        />
      </View>
    </FlowScreen>
  );
};
