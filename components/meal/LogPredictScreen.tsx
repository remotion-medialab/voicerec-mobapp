import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlowScreen, Kicker, Title, GroupLabel, RatingSlider, PrimaryButton, colors } from '../ui';
import { NoteInput } from '../ui/NoteInput';
import { createMealSession, setMealPhoto, savePrediction } from '../../services/meals';
import { promptForPhoto, uploadMealPhoto } from '../../services/photos';

interface LogPredictScreenProps {
  /** Returns to the feed after the meal is logged + predicted. */
  onComplete: () => void;
  onBack: () => void;
}

/**
 * PHASE 1 — Log + predict (Screen 7). Snap/upload a photo of the plate, name it,
 * then predict how it'll land. Creates the MealSession (status awaiting_reaction)
 * and its UserPrediction.
 */
export const LogPredictScreen: React.FC<LogPredictScreenProps> = ({ onComplete, onBack }) => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [mealText, setMealText] = useState('');
  const [note, setNote] = useState('');
  const [fullness, setFullness] = useState(5);
  const [energy, setEnergy] = useState(7);
  const [satisfaction, setSatisfaction] = useState(8);
  const [saving, setSaving] = useState(false);

  const addPhoto = async () => {
    const uri = await promptForPhoto();
    if (uri) setPhotoUri(uri);
  };

  const canSave = mealText.trim().length > 0 && !saving;

  const lockIn = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const mealId = await createMealSession({
        meal_text: mealText.trim(),
        action_taken: 'predict',
      });
      if (photoUri) {
        try {
          const url = await uploadMealPhoto(photoUri, mealId);
          await setMealPhoto(mealId, url);
        } catch (e) {
          console.error('Failed to upload meal photo:', e);
        }
      }
      await savePrediction({
        meal_id: mealId,
        pre_meal_note: note.trim() || undefined,
        predicted_fullness: fullness,
        predicted_energy: energy,
        predicted_satisfaction: satisfaction,
      });
      onComplete();
    } catch (e) {
      console.error('Failed to log + predict meal:', e);
      setSaving(false);
    }
  };

  return (
    <FlowScreen
      onBack={onBack}
      step="Log · predict"
      footer={
        <PrimaryButton label="Lock it in" onPress={lockIn} loading={saving} disabled={!canSave} />
      }>
      <Kicker style={{ marginTop: 8 }}>LOG YOUR MEAL</Kicker>
      <Title style={{ marginTop: 8 }}>How will it{'\n'}land?</Title>

      {/* Photo capture */}
      <TouchableOpacity
        onPress={addPhoto}
        activeOpacity={0.85}
        className="mt-5 items-center justify-center overflow-hidden"
        style={{
          height: 180,
          borderRadius: 20,
          backgroundColor: colors.field,
          borderWidth: photoUri ? 0 : 1,
          borderColor: colors.border,
          borderStyle: 'dashed',
        }}>
        {photoUri ? (
          <>
            <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
            <View
              className="absolute bottom-3 right-3 flex-row items-center rounded-full"
              style={{
                backgroundColor: 'rgba(0,0,0,0.55)',
                paddingVertical: 6,
                paddingHorizontal: 12,
                gap: 6,
              }}>
              <Ionicons name="camera" size={14} color={colors.white} />
              <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600' }}>Change</Text>
            </View>
          </>
        ) : (
          <View className="items-center" style={{ gap: 8 }}>
            <View
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.white }}>
              <Ionicons name="camera" size={22} color={colors.primary} />
            </View>
            <Text style={{ color: colors.subtle, fontSize: 14, fontWeight: '600' }}>
              Snap or upload your plate
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Meal name */}
      <GroupLabel style={{ marginTop: 20 }}>WHAT IS IT?</GroupLabel>
      <TextInput
        value={mealText}
        onChangeText={setMealText}
        placeholder="e.g. ramen + dumplings"
        placeholderTextColor={colors.kicker}
        className="mt-3"
        style={{
          backgroundColor: colors.field,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 16,
          color: colors.ink,
          fontSize: 15,
        }}
      />

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
      <View style={{ height: 8 }} />
      {saving ? (
        <View className="mt-2 flex-row items-center justify-center" style={{ gap: 8 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.subtle, fontSize: 13 }}>Saving your meal…</Text>
        </View>
      ) : null}
    </FlowScreen>
  );
};
