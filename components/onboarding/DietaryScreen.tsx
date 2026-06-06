import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlowScreen, Kicker, Title, GroupLabel, ChipGroup, PrimaryButton, colors } from '../ui';
import { DIETARY_RESTRICTIONS } from '../mealOptions';
import { saveDietary } from '../../services/profile';

interface DietaryScreenProps {
  onNext: () => void;
  onBack: () => void;
}

/** Screen 3 — structured restrictions (chips) + free-text allergy tags. */
export const DietaryScreen: React.FC<DietaryScreenProps> = ({ onNext, onBack }) => {
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const addAllergy = () => {
    const v = draft.trim();
    if (v && !allergies.includes(v)) setAllergies([...allergies, v]);
    setDraft('');
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      await saveDietary({ dietary_restrictions: restrictions, allergies });
      onNext();
    } catch (e) {
      console.error('Failed to save dietary profile:', e);
      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <FlowScreen
      onBack={onBack}
      step="Step 2 of 3"
      footer={<PrimaryButton label="Next" onPress={handleNext} loading={saving} />}>
      <Kicker style={{ marginTop: 8 }}>SAFETY FIRST</Kicker>
      <Title style={{ marginTop: 8 }}>Any food restrictions?</Title>

      <GroupLabel style={{ marginTop: 24 }}>DIETARY RESTRICTIONS</GroupLabel>
      <View className="mt-3">
        <ChipGroup
          options={DIETARY_RESTRICTIONS}
          value={restrictions}
          onChange={setRestrictions}
          variant="dark"
        />
      </View>

      <GroupLabel style={{ marginTop: 28 }}>ALLERGIES · TYPE YOUR OWN</GroupLabel>
      <View className="mt-3">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addAllergy}
          returnKeyType="done"
          placeholder="e.g. peanuts, shellfish"
          placeholderTextColor={colors.kicker}
          style={{
            backgroundColor: colors.field,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 14,
            color: colors.ink,
            fontSize: 15,
          }}
        />
      </View>

      {allergies.length > 0 && (
        <View className="mt-3 flex-row flex-wrap" style={{ gap: 10 }}>
          {allergies.map((a) => (
            <TouchableOpacity
              key={a}
              onPress={() => setAllergies(allergies.filter((x) => x !== a))}
              activeOpacity={0.8}
              className="flex-row items-center"
              style={{
                backgroundColor: colors.ink,
                borderRadius: 999,
                paddingVertical: 8,
                paddingHorizontal: 14,
                gap: 6,
              }}>
              <Text style={{ color: colors.white, fontSize: 14, fontWeight: '500' }}>{a}</Text>
              <Ionicons name="close" size={14} color={colors.white} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </FlowScreen>
  );
};
