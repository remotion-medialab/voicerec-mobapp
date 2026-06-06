import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlowScreen, Kicker, PrimaryButton, colors } from '../ui';
import { NoteInput } from '../ui/NoteInput';
import { saveVoiceResponse } from '../../services/profile';
import { VoiceQuestionId } from '../../types/meal';

interface VoiceOnboardingScreenProps {
  onNext: () => void;
  onBack: () => void;
}

const QUESTIONS: { id: VoiceQuestionId; prompt: string }[] = [
  {
    id: 'goals_habits',
    prompt:
      "I'd love to understand your taste and eating habits so I can personalize things for you.",
  },
  { id: 'routine', prompt: 'Walk me through a typical day — when and how do you usually eat?' },
  { id: 'food_love', prompt: 'Tell me about a food you love — and what makes it special.' },
];

/**
 * Screen 4 — "meet your chef" voice onboarding. Text-only build: each prompt is
 * answered by typing; the answer is saved as VoiceResponse.transcript.
 */
export const VoiceOnboardingScreen: React.FC<VoiceOnboardingScreenProps> = ({ onNext, onBack }) => {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  const q = QUESTIONS[index];
  const isLast = index === QUESTIONS.length - 1;

  const advance = async () => {
    setSaving(true);
    try {
      if (answer.trim()) await saveVoiceResponse(q.id, answer.trim());
    } catch (e) {
      console.error('Failed to save voice response:', e);
    } finally {
      setSaving(false);
    }
    if (isLast) {
      onNext();
    } else {
      setIndex(index + 1);
      setAnswer('');
    }
  };

  return (
    <FlowScreen
      onBack={onBack}
      step={started ? `${index + 1} of ${QUESTIONS.length}` : undefined}
      footer={
        started ? (
          <PrimaryButton label={isLast ? 'Finish' : 'Next'} onPress={advance} loading={saving} />
        ) : (
          <PrimaryButton label="Let's talk" onPress={() => setStarted(true)} />
        )
      }>
      <Kicker style={{ marginTop: 8 }}>ONBOARDING · MEET YOUR CHEF</Kicker>

      {/* Plate emblem */}
      <View className="mt-8 items-center">
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: 150,
            height: 150,
            backgroundColor: '#E7ECFB',
            borderWidth: 2,
            borderColor: '#C5D0F4',
            borderStyle: 'dashed',
          }}>
          <Ionicons name="restaurant-outline" size={56} color={colors.primary} />
        </View>
      </View>

      {/* Chef speech bubble */}
      <View
        className="mt-8"
        style={{
          backgroundColor: '#EEF2FE',
          borderColor: '#CBD6F7',
          borderWidth: 1,
          borderRadius: 18,
          padding: 18,
        }}>
        <Text
          style={{
            color: colors.ink,
            fontSize: 17,
            fontStyle: 'italic',
            lineHeight: 25,
            textAlign: 'center',
          }}>
          {q.prompt}
        </Text>
      </View>

      {/* Avatar */}
      <View className="mt-4 flex-row items-center" style={{ gap: 8 }}>
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: '#E8542F' }}>
          <Text className="font-bold text-white">M</Text>
        </View>
      </View>

      {started && (
        <View className="mt-5">
          <NoteInput
            value={answer}
            onChangeText={setAnswer}
            placeholder="Type your answer…"
            showMic
            minHeight={88}
          />
        </View>
      )}
    </FlowScreen>
  );
};
