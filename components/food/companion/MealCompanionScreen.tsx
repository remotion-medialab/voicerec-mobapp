import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { streamMealSuggestion } from '../../../services/aiCompanion';
import { useFood } from '../../../contexts/FoodContext';
import { UserFoodProfile } from '../../../types/food';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

interface Props {
  initialMood: string;
  onLogMeal: (mealName: string) => void;
  onBack: () => void;
}

const EMPTY_PROFILE: UserFoodProfile = {
  uid: '',
  favoriteCuisines: [],
  restrictions: [],
  goals: [],
  foodLoveDescription: '',
  changeDescription: '',
  onboardingComplete: false,
};

export function MealCompanionScreen({ initialMood, onLogMeal, onBack }: Props) {
  const { foodProfile } = useFood();
  const profile = foodProfile ?? EMPTY_PROFILE;

  const [messages, setMessages] = useState<Message[]>([
    { role: 'user', text: initialMood },
  ]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [suggestedMeal, setSuggestedMeal] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const appendAssistantChunk = (chunk: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant' && last.streaming) {
        return [...prev.slice(0, -1), { ...last, text: last.text + chunk }];
      }
      return [...prev, { role: 'assistant', text: chunk, streaming: true }];
    });
  };

  const finishStreaming = () => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, streaming: false }];
      }
      return prev;
    });
    setStreaming(false);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Message = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    await streamMealSuggestion(profile, text, appendAssistantChunk, finishStreaming);
  };

  // Auto-send initial mood on mount
  useEffect(() => {
    setStreaming(true);
    streamMealSuggestion(profile, initialMood, appendAssistantChunk, finishStreaming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // Detect meal name from last assistant message
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Meal companion</Text>
            <View style={styles.onlineDot} />
          </View>
          <View style={{ width: 24 }} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}>
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.aiText]}>
                {msg.text}
                {msg.streaming && <Text style={styles.cursor}> ▌</Text>}
              </Text>
            </View>
          ))}
          {streaming && messages[messages.length - 1]?.role === 'user' && (
            <View style={styles.aiBubble}>
              <ActivityIndicator size="small" color="#6366f1" />
            </View>
          )}
        </ScrollView>

        {/* Log meal button */}
        {lastAssistant && !streaming && (
          <View style={styles.logBanner}>
            <TouchableOpacity
              style={styles.logBtn}
              onPress={() => onLogMeal(suggestedMeal ?? 'Meal')}
              activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.logBtnText}>Log this meal</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything…"
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || streaming}
            activeOpacity={0.85}>
            <Ionicons name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  kav: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 10 },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#6366f1' },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', minWidth: 48, minHeight: 40, justifyContent: 'center' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#ffffff' },
  aiText: { color: '#0f172a' },
  cursor: { color: '#6366f1' },
  logBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  logBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 50,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#c7d2fe' },
});
