import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground, ScreenHeader, colors } from '../ui';
import { createMealSession, setMealPhoto } from '../../services/meals';
import { promptForPhoto, uploadMealPhoto } from '../../services/photos';

interface CompanionScreenProps {
  /** Proceeds to prediction with the created meal_id + the chosen meal text. */
  onNext: (mealId: string, mealText: string) => void;
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

const SUGGESTIONS = ['Predict outcome', 'Suggest alternatives', 'Explain choice'];

/**
 * Screen 6 — Meal Companion (stubbed). No live AI: it captures the meal intent,
 * echoes a canned reply, and on "Lock in" creates the MealSession that mints the
 * meal_id used by every later phase.
 */
export const CompanionScreen: React.FC<CompanionScreenProps> = ({ onNext, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState('');
  const [mealText, setMealText] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const attachPhoto = async () => {
    const uri = await promptForPhoto();
    if (uri) setPhotoUri(uri);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: `u${Date.now()}`, role: 'user', text },
      {
        id: `c${Date.now()}`,
        role: 'chef',
        text: `Got it — ${text}. That sounds like a solid pick. Want to predict how it'll land before you commit?`,
      },
    ]);
    setMealText(text);
    setDraft('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const lockIn = async () => {
    if (!mealText) return;
    setCreating(true);
    try {
      const mealId = await createMealSession({ meal_text: mealText, action_taken: 'predict' });
      if (photoUri) {
        // Best-effort: don't block logging the meal if the upload fails.
        try {
          const url = await uploadMealPhoto(photoUri, mealId);
          await setMealPhoto(mealId, url);
        } catch (e) {
          console.error('Failed to upload meal photo:', e);
        }
      }
      onNext(mealId, mealText);
    } catch (e) {
      console.error('Failed to create meal session:', e);
    } finally {
      setCreating(false);
    }
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

          {/* Suggested actions (visual stubs) */}
          <View className="flex-row flex-wrap px-5 pb-2" style={{ gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <View
                key={s}
                style={{
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingVertical: 7,
                  paddingHorizontal: 12,
                  backgroundColor: colors.white,
                }}>
                <Text style={{ color: colors.subtle, fontSize: 13 }}>{s}</Text>
              </View>
            ))}
          </View>

          {mealText && (
            <View className="px-5 pb-2" style={{ gap: 10 }}>
              {photoUri && (
                <View className="flex-row items-center" style={{ gap: 10 }}>
                  <Image
                    source={{ uri: photoUri }}
                    style={{ width: 44, height: 44, borderRadius: 10 }}
                  />
                  <Text style={{ color: colors.subtle, fontSize: 13, flex: 1 }}>
                    Photo attached
                  </Text>
                  <TouchableOpacity onPress={() => setPhotoUri(null)} activeOpacity={0.7}>
                    <Ionicons name="close-circle" size={20} color={colors.kicker} />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                onPress={lockIn}
                disabled={creating}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 999,
                  paddingVertical: 15,
                  alignItems: 'center',
                }}>
                <Text className="text-base font-semibold text-white">
                  {creating ? 'Locking in…' : 'Lock in this meal →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input bar */}
          <View className="flex-row items-center px-5 pb-3 pt-1" style={{ gap: 10 }}>
            <TouchableOpacity
              onPress={attachPhoto}
              activeOpacity={0.85}
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.field }}>
              <Ionicons name="camera" size={20} color={colors.inkSoft} />
            </TouchableOpacity>
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
