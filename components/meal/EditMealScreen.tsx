import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { NoteInput } from '../ui/NoteInput';
import { getMealRecord, saveMealEdit } from '../../services/meals';

interface EditMealScreenProps {
  mealId: string;
  onClose: () => void;
}

/** Screen 13 — edit a logged meal. Loads the record, patches it via saveMealEdit. */
export const EditMealScreen: React.FC<EditMealScreenProps> = ({ mealId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [mealText, setMealText] = useState('');
  const [fullness, setFullness] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [satisfaction, setSatisfaction] = useState(5);
  const [portion, setPortion] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const record = await getMealRecord(mealId);
        if (record) {
          setMealText(record.meal_text);
          setFullness(record.actual?.actual_fullness ?? 5);
          setEnergy(record.actual?.actual_energy ?? 5);
          setSatisfaction(record.actual?.actual_satisfaction ?? 5);
          setPortion(record.actual?.portion_eaten ?? null);
          setNote(record.bodyNote?.body_note ?? '');
        }
      } catch (e) {
        console.error('Failed to load meal record:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [mealId]);

  const save = async () => {
    setSaving(true);
    try {
      await saveMealEdit({
        meal_id: mealId,
        meal_text: mealText.trim() || undefined,
        actual_fullness: fullness,
        actual_energy: energy,
        actual_satisfaction: satisfaction,
        portion_eaten: portion ?? undefined,
        user_note: note.trim() || undefined,
      });
    } catch (e) {
      console.error('Failed to save meal edit:', e);
    } finally {
      setSaving(false);
    }
    onClose();
  };

  if (loading) {
    return (
      <FlowScreen onBack={onClose}>
        <View className="mt-40 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </FlowScreen>
    );
  }

  return (
    <FlowScreen
      onBack={onClose}
      step="Edit log"
      footer={
        <View style={{ gap: 6 }}>
          <PrimaryButton label="Save changes" onPress={save} loading={saving} arrow={false} />
          <TouchableOpacity className="items-center py-2" activeOpacity={0.7} onPress={onClose}>
            <Text style={{ color: colors.subtle, fontSize: 14 }}>Discard</Text>
          </TouchableOpacity>
        </View>
      }>
      <Kicker style={{ marginTop: 8 }}>EDIT THIS MEAL</Kicker>
      <Title style={{ marginTop: 8 }}>Fix anything</Title>

      <GroupLabel style={{ marginTop: 22 }}>PHOTO &amp; NAME</GroupLabel>
      <View className="mt-3 flex-row items-center" style={{ gap: 12 }}>
        <View
          className="items-center justify-center"
          style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: colors.field }}>
          <Ionicons name="image-outline" size={24} color={colors.kicker} />
        </View>
        <TextInput
          value={mealText}
          onChangeText={setMealText}
          placeholder="Meal name"
          placeholderTextColor={colors.kicker}
          style={{
            flex: 1,
            backgroundColor: colors.field,
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 16,
            color: colors.ink,
            fontSize: 15,
          }}
        />
      </View>

      <GroupLabel style={{ marginTop: 24 }}>BODY · ACTUAL</GroupLabel>
      <View className="mt-4" style={{ gap: 22 }}>
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

      <GroupLabel style={{ marginTop: 24 }}>HOW MUCH YOU ATE</GroupLabel>
      <View className="mt-3">
        <PortionSelector value={portion} onChange={setPortion} />
      </View>

      <GroupLabel style={{ marginTop: 24 }}>YOUR NOTE</GroupLabel>
      <View className="mt-3">
        <NoteInput value={note} onChangeText={setNote} placeholder="tap to edit" showMic />
      </View>
    </FlowScreen>
  );
};
