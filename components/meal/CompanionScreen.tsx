import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground, ScreenHeader, colors } from '../ui';

interface CompanionScreenProps {
  /** Once a meal is settled, forward into logging (Screen 7) with its name. */
  onDecided: (mealText: string) => void;
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'chef' | 'user';
  text: string;
}

const GREETING: Message = {
  id: 'greet',
  role: 'chef',
  text: "Tell me what you're thinking of eating, and I'll help you weigh it.",
};

/**
 * Screen 6 — Meal Companion (stubbed, no live AI). A decision aid: the user
 * chats to settle on what to eat, then taps "Log this meal" to carry that
 * choice into the photo-log flow. No Firestore write here — the MealSession is
 * created in Screen 7 so both entry paths converge on a single meal record.
 */
export const CompanionScreen: React.FC<CompanionScreenProps> = ({ onDecided, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState('');
  const [mealText, setMealText] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: `u${Date.now()}`, role: 'user', text },
      {
        id: `c${Date.now()}`,
        role: 'chef',
        text: `Got it — ${text}. That sounds like a solid pick. Ready to log it and predict how it'll land?`,
      },
    ]);
    setMealText(text);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <View className="flex-1">
      <GradientBackground height={160} />
      <StatusBar barStyle="dark-content" />
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScreenHeader onBack={onBack} step="meal companion" />

          <ScrollView
            ref={scrollRef}
            className="flex-1 px-5"
            contentContainerStyle={{ paddingVertical: 12, gap: 12 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
          </ScrollView>

          {mealText && (
            <View className="px-5 pb-2">
              <TouchableOpacity
                onPress={() => onDecided(mealText)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 999,
                  paddingVertical: 15,
                  alignItems: 'center',
                }}>
                <Text className="text-base font-semibold text-white">Log this meal →</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input bar */}
          <View className="flex-row items-center px-5 pb-3 pt-1" style={{ gap: 10 }}>
            <View
              className="flex-1 flex-row items-center"
              style={{
                backgroundColor: colors.field,
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={send}
                placeholder="e.g. ramen + dumplings"
                placeholderTextColor={colors.kicker}
                returnKeyType="send"
                style={{ flex: 1, color: colors.ink, fontSize: 15 }}
              />
            </View>
            <TouchableOpacity
              onPress={send}
              activeOpacity={0.85}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primary }}>
              <Ionicons name="arrow-up" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const Bubble: React.FC<{ message: Message }> = ({ message }) => {
  const isChef = message.role === 'chef';
  return (
    <View className={isChef ? 'items-start' : 'items-end'}>
      <View
        style={{
          maxWidth: '82%',
          backgroundColor: isChef ? '#EEF2FE' : colors.primary,
          borderColor: isChef ? '#CBD6F7' : colors.primary,
          borderWidth: 1,
          borderRadius: 18,
          paddingHorizontal: 14,
          paddingVertical: 11,
        }}>
        <Text style={{ color: isChef ? colors.ink : colors.white, fontSize: 15, lineHeight: 21 }}>
          {message.text}
        </Text>
      </View>
    </View>
  );
};
