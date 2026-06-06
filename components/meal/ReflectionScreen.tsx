import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlowScreen, Kicker, Title, PrimaryButton, colors } from '../ui';
import { NoteInput } from '../ui/NoteInput';
import { saveReflection } from '../../services/meals';
import { InputMethod } from '../../types/meal';

interface ReflectionScreenProps {
  mealId: string;
  onNext: () => void;
  onBack: () => void;
}

/** Screen 11 — reflect on the gap. Writes Reflection (causal_attribution + input_method). */
export const ReflectionScreen: React.FC<ReflectionScreenProps> = ({ mealId, onNext, onBack }) => {
  const [method, setMethod] = useState<InputMethod>('text');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await saveReflection({
        meal_id: mealId,
        causal_attribution: note.trim() || undefined,
        input_method: method,
      });
    } catch (e) {
      console.error('Failed to save reflection:', e);
    } finally {
      setSaving(false);
    }
    onNext();
  };

  return (
    <FlowScreen
      onBack={onBack}
      step="+30 min · 3 of 4"
      footer={<PrimaryButton label="Continue" onPress={save} loading={saving} />}>
      <Kicker style={{ marginTop: 8 }}>NOTICE THE GAP</Kicker>
      <Title style={{ marginTop: 8 }}>Why, do you think?</Title>

      <View
        className="mt-5"
        style={{ backgroundColor: '#F4F6FC', borderRadius: 20, padding: 18, gap: 16 }}>
        <Text
          style={{ color: colors.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>
          AFTER CALIBRATION
        </Text>
        <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '700', lineHeight: 28 }}>
          What might have <Text style={{ color: colors.primary }}>caused</Text> a different outcome
          than what you had <Text style={{ color: colors.primary }}>expected?</Text>
        </Text>

        {/* Input method toggle */}
        <View className="flex-row" style={{ gap: 12 }}>
          <MethodButton
            label="Quick note"
            icon="pencil"
            active={method === 'text'}
            onPress={() => setMethod('text')}
          />
          <MethodButton
            label="Voice"
            icon="mic"
            active={method === 'voice'}
            onPress={() => setMethod('voice')}
          />
        </View>

        <NoteInput
          value={note}
          onChangeText={setNote}
          placeholder="One sentence — becomes a note to future you"
          showMic={method === 'voice'}
        />
      </View>
    </FlowScreen>
  );
};

const MethodButton: React.FC<{
  label: string;
  icon: any;
  active: boolean;
  onPress: () => void;
}> = ({ label, icon, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.8}
    className="flex-1 flex-row items-center justify-center"
    style={{
      backgroundColor: active ? colors.ink : colors.white,
      borderColor: active ? colors.ink : colors.border,
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 12,
      gap: 8,
    }}>
    <Ionicons name={icon} size={16} color={active ? colors.white : colors.inkSoft} />
    <Text style={{ color: active ? colors.white : colors.inkSoft, fontWeight: '600' }}>
      {label}
    </Text>
  </TouchableOpacity>
);
