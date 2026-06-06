import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlowScreen, Kicker, Title, GroupLabel, PrimaryButton, colors } from '../ui';
import { NoteInput } from '../ui/NoteInput';
import { saveBodyNote } from '../../services/meals';

interface BodyNoteScreenProps {
  mealId: string;
  onComplete: () => void;
  onBack: () => void;
}

/** Screen 12 — final body check-in. Writes BodyNote, then ends the meal flow. */
export const BodyNoteScreen: React.FC<BodyNoteScreenProps> = ({ mealId, onComplete, onBack }) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await saveBodyNote({ meal_id: mealId, body_note: note.trim() || undefined });
    } catch (e) {
      console.error('Failed to save body note:', e);
    } finally {
      setSaving(false);
    }
    onComplete();
  };

  return (
    <FlowScreen
      onBack={onBack}
      step="+30 min · 4 of 4"
      footer={<PrimaryButton label="Complete this meal" onPress={save} loading={saving} />}>
      <Kicker style={{ marginTop: 8 }}>POST-MEAL · BODY</Kicker>
      <Title style={{ marginTop: 8 }}>
        How does{'\n'}your body{'\n'}feel right now?
      </Title>
      <Text style={{ color: colors.subtle, fontSize: 14, marginTop: 10, fontStyle: 'italic' }}>
        Tap the mic, then check the note before saving.
      </Text>

      {/* Decorative mic (text-only build) */}
      <View className="mt-8 items-center">
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: 96,
            height: 96,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 5,
          }}>
          <Ionicons name="mic" size={36} color={colors.white} />
        </View>
        <Text style={{ color: colors.kicker, fontSize: 11, letterSpacing: 2, marginTop: 12 }}>
          TAP TO TALK
        </Text>
      </View>

      <GroupLabel style={{ marginTop: 28 }}>YOUR NOTE · EDIT BEFORE SAVING</GroupLabel>
      <View className="mt-3">
        <NoteInput
          value={note}
          onChangeText={setNote}
          placeholder="Tap mic above, or type how your body feels…"
          showMic
        />
      </View>
    </FlowScreen>
  );
};
