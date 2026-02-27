import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserDietGoal } from '../../services/auth';

const GOAL_OPTIONS = [
  { emoji: '🏃', label: 'Lose weight' },
  { emoji: '⚖️', label: 'Maintain weight' },
  { emoji: '💪', label: 'Build muscle' },
  { emoji: '⚡', label: 'Improve energy' },
  { emoji: '🌿', label: 'Reduce bloating' },
  { emoji: '✨', label: 'Other' },
];

interface GoalSelectionScreenProps {
  onComplete: () => void;
}

export const GoalSelectionScreen: React.FC<GoalSelectionScreenProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [saving, setSaving] = useState(false);

  const effectiveGoal = selected === 'Other' ? otherText.trim() : selected;
  const canContinue = !!effectiveGoal;

  const handleContinue = async () => {
    if (!user || !effectiveGoal) return;
    setSaving(true);
    try {
      await updateUserDietGoal(user.uid, effectiveGoal);
      await onComplete();
    } catch (err) {
      console.error('Failed to save diet goal:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: 36 }}>
          <Text style={{ fontSize: 44, marginBottom: 16 }}>🎯</Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '600',
              color: '#1e293b',
              textAlign: 'center',
              marginBottom: 8,
            }}>
            What's your main health goal?
          </Text>
          <Text style={{ fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 }}>
            This helps us personalize your meal suggestions and reflections.
          </Text>
        </View>

        {/* Goal options */}
        <View style={{ gap: 10, marginBottom: 20 }}>
          {GOAL_OPTIONS.map(({ emoji, label }) => {
            const isSelected = selected === label;
            return (
              <TouchableOpacity
                key={label}
                onPress={() => setSelected(label)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: isSelected ? '#3b82f6' : '#e2e8f0',
                  borderRadius: 14,
                  paddingVertical: 15,
                  paddingHorizontal: 18,
                  backgroundColor: isSelected ? '#eff6ff' : '#fff',
                  shadowColor: isSelected ? '#3b82f6' : '#000',
                  shadowOffset: { width: 0, height: isSelected ? 4 : 1 },
                  shadowOpacity: isSelected ? 0.15 : 0.04,
                  shadowRadius: isSelected ? 10 : 4,
                  elevation: isSelected ? 4 : 1,
                }}>
                <Text style={{ fontSize: 22, marginRight: 14 }}>{emoji}</Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: isSelected ? '600' : '400',
                    color: isSelected ? '#2563eb' : '#334155',
                    flex: 1,
                  }}>
                  {label}
                </Text>
                {isSelected && (
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: '#3b82f6',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {selected === 'Other' && (
          <TextInput
            style={{
              borderWidth: 1.5,
              borderColor: '#93c5fd',
              borderRadius: 14,
              paddingVertical: 14,
              paddingHorizontal: 16,
              fontSize: 15,
              color: '#1e293b',
              backgroundColor: '#fff',
              marginBottom: 20,
            }}
            placeholder="Describe your goal..."
            value={otherText}
            onChangeText={setOtherText}
            placeholderTextColor="#9ca3af"
            returnKeyType="done"
          />
        )}

        <TouchableOpacity
          onPress={handleContinue}
          disabled={!canContinue || saving}
          activeOpacity={0.85}
          style={{
            borderRadius: 30,
            backgroundColor: canContinue ? '#3b82f6' : '#cbd5e1',
            paddingVertical: 17,
            alignItems: 'center',
            marginTop: 8,
            shadowColor: '#3b82f6',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: canContinue ? 0.3 : 0,
            shadowRadius: 10,
            elevation: canContinue ? 6 : 0,
          }}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: canContinue ? '#fff' : '#94a3b8',
              }}>
              Start my journey
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
