import React, { useState } from 'react';
import { View, Text } from 'react-native';
import {
  FlowScreen,
  Kicker,
  Title,
  GroupLabel,
  ChipGroup,
  FlavorWheel,
  PrimaryButton,
  FlavorLevels,
  FLAVOR_ORDER,
  colors,
} from '../ui';
import { NoteInput } from '../ui/NoteInput';
import { CUISINES } from '../mealOptions';
import { saveTastes } from '../../services/profile';
import { FlavorProfile } from '../../types/meal';

interface TastesScreenProps {
  onNext: () => void;
  onBack: () => void;
}

/** Screen 2 — cuisines (pick ≤3), flavor wheel, free-text dislikes. */
export const TastesScreen: React.FC<TastesScreenProps> = ({ onNext, onBack }) => {
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [flavors, setFlavors] = useState<FlavorLevels>({});
  const [dislikes, setDislikes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    setSaving(true);
    try {
      const flavor_preferences = FLAVOR_ORDER.filter(
        (f) => (flavors[f] ?? 0) > 0
      ) as FlavorProfile[];
      await saveTastes({
        preferred_cuisines: cuisines,
        flavor_preferences,
        dislikes: dislikes.trim() || undefined,
      });
      onNext();
    } catch (e) {
      console.error('Failed to save tastes:', e);
      onNext(); // don't trap the user on a transient write failure
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowScreen
      onBack={onBack}
      step="Step 1 of 3"
      footer={<PrimaryButton label="Next" onPress={handleNext} loading={saving} />}>
      <Kicker style={{ marginTop: 8 }}>TASTES</Kicker>
      <Title style={{ marginTop: 8 }}>What do you{'\n'}love to eat?</Title>

      <GroupLabel style={{ marginTop: 24 }}>
        CUISINES · PICK UP TO 3 ({cuisines.length}/3)
      </GroupLabel>
      <View className="mt-3">
        <ChipGroup
          options={CUISINES}
          value={cuisines}
          onChange={setCuisines}
          max={3}
          variant="blue"
        />
      </View>

      <GroupLabel style={{ marginTop: 28 }}>FLAVORS YOU LOVE · TAP THE WHEEL</GroupLabel>
      <View className="mt-4">
        <FlavorWheel value={flavors} onChange={setFlavors} />
      </View>
      <Text className="mt-3 text-center" style={{ color: colors.subtle, fontSize: 13 }}>
        Tap a taste to dial it up
      </Text>

      <GroupLabel style={{ marginTop: 24 }}>
        ANYTHING YOU DON&apos;T LIKE TO EAT — AND WHY?
      </GroupLabel>
      <View className="mt-3">
        <NoteInput
          value={dislikes}
          onChangeText={setDislikes}
          placeholder="e.g. cilantro tastes soapy to me; too much dairy upsets my stomach…"
        />
      </View>
    </FlowScreen>
  );
};
