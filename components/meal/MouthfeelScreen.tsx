import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { FlowScreen, Kicker, Title, GroupLabel, ChipGroup, PrimaryButton, colors } from '../ui';
import {
  MOUTHFEEL_BODY,
  MOUTHFEEL_SURFACE,
  MOUTHFEEL_REACTION,
  MOUTHFEEL_AFTERTASTE,
} from '../mealOptions';
import { saveMouthfeelRating } from '../../services/meals';

interface MouthfeelScreenProps {
  mealId: string;
  mealText: string;
  onNext: () => void;
  onBack: () => void;
}

/** Screen 9 — mouthfeel: body / surface / reaction / aftertaste chip groups. */
export const MouthfeelScreen: React.FC<MouthfeelScreenProps> = ({
  mealId,
  mealText,
  onNext,
  onBack,
}) => {
  const [body, setBody] = useState<string[]>([]);
  const [surface, setSurface] = useState<string[]>([]);
  const [reaction, setReaction] = useState<string[]>([]);
  const [aftertaste, setAftertaste] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await saveMouthfeelRating({ meal_id: mealId, body, surface, reaction, aftertaste });
    } catch (e) {
      console.error('Failed to save mouthfeel rating:', e);
    } finally {
      setSaving(false);
    }
    onNext();
  };

  return (
    <FlowScreen
      onBack={onBack}
      step="Variant D · mouthfeel"
      footer={<PrimaryButton label="Save · ask body in 30 min" onPress={save} loading={saving} />}>
      <Kicker style={{ marginTop: 8 }}>{mealText.toUpperCase()}</Kicker>
      <Title style={{ marginTop: 8 }}>How did it{'\n'}feel?</Title>
      <Text
        style={{
          color: colors.subtle,
          fontSize: 14,
          marginTop: 10,
          lineHeight: 20,
          fontStyle: 'italic',
        }}>
        Beyond flavor — the feel in your mouth and after. Pick what matches your body&apos;s memory.
      </Text>

      <GroupLabel style={{ marginTop: 22 }}>BODY</GroupLabel>
      <View className="mt-3">
        <ChipGroup options={MOUTHFEEL_BODY} value={body} onChange={setBody} variant="dark" />
      </View>

      <GroupLabel style={{ marginTop: 22 }}>SURFACE</GroupLabel>
      <View className="mt-3">
        <ChipGroup
          options={MOUTHFEEL_SURFACE}
          value={surface}
          onChange={setSurface}
          variant="dark"
        />
      </View>

      <GroupLabel style={{ marginTop: 22 }}>REACTION</GroupLabel>
      <View className="mt-3">
        <ChipGroup
          options={MOUTHFEEL_REACTION}
          value={reaction}
          onChange={setReaction}
          variant="dark"
        />
      </View>

      <GroupLabel style={{ marginTop: 22 }}>AFTERTASTE</GroupLabel>
      <View className="mt-3">
        <ChipGroup
          options={MOUTHFEEL_AFTERTASTE}
          value={aftertaste}
          onChange={setAftertaste}
          variant="dark"
        />
      </View>
    </FlowScreen>
  );
};
