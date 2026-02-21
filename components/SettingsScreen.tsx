import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { updateUserDietGoal, logOut } from '../services/auth';

const GOAL_OPTIONS = [
  'Lose weight',
  'Maintain weight',
  'Build muscle',
  'Improve energy',
  'Reduce bloating',
  'Other',
];

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const [editingGoal, setEditingGoal] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    const current = userProfile?.dietGoal || '';
    if (GOAL_OPTIONS.includes(current) && current !== 'Other') {
      setSelected(current);
    } else if (current) {
      setSelected('Other');
      setOtherText(current);
    } else {
      setSelected(null);
    }
    setEditingGoal(true);
  };

  const cancelEdit = () => {
    setEditingGoal(false);
    setSelected(null);
    setOtherText('');
  };

  const effectiveGoal = selected === 'Other' ? otherText.trim() : selected;

  const handleSaveGoal = async () => {
    if (!user || !effectiveGoal) return;
    setSaving(true);
    try {
      await updateUserDietGoal(user.uid, effectiveGoal);
      await refreshProfile();
      setEditingGoal(false);
    } catch (err) {
      Alert.alert('Error', 'Could not save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diet Goal</Text>
        {!editingGoal ? (
          <View style={styles.goalRow}>
            <Text style={styles.goalValue}>{userProfile?.dietGoal || 'Not set'}</Text>
            <TouchableOpacity onPress={startEdit} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.editContainer}>
            <View style={styles.optionsContainer}>
              {GOAL_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.card, selected === option && styles.cardSelected]}
                  onPress={() => setSelected(option)}
                  activeOpacity={0.7}>
                  <Text style={[styles.cardText, selected === option && styles.cardTextSelected]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selected === 'Other' && (
              <TextInput
                style={styles.otherInput}
                placeholder="Describe your goal..."
                value={otherText}
                onChangeText={setOtherText}
                placeholderTextColor="#9ca3af"
              />
            )}

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.saveButton, !effectiveGoal && styles.saveButtonDisabled]}
                onPress={handleSaveGoal}
                disabled={!effectiveGoal || saving}
                activeOpacity={0.8}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit} activeOpacity={0.8}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Study Condition</Text>
        <Text style={styles.conditionValue}>
          {userProfile?.condition ? `Condition ${userProfile.condition}` : 'Not assigned'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.emailValue}>{userProfile?.email || user?.email}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  backButton: { marginBottom: 24 },
  backText: { fontSize: 16, color: '#6b7280' },
  title: { fontSize: 26, fontWeight: '700', color: '#111827', marginBottom: 32 },
  section: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalValue: { fontSize: 16, color: '#111827', fontWeight: '500' },
  editButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  editButtonText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  editContainer: { gap: 12 },
  optionsContainer: { gap: 8 },
  card: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
  },
  cardSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  cardText: { fontSize: 15, color: '#374151' },
  cardTextSelected: { color: '#2563eb', fontWeight: '600' },
  otherInput: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
  },
  editActions: { flexDirection: 'row', gap: 12 },
  saveButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: { backgroundColor: '#93c5fd' },
  saveButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 15, color: '#6b7280' },
  conditionValue: { fontSize: 15, color: '#374151' },
  emailValue: { fontSize: 15, color: '#374151' },
  logoutButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: { fontSize: 15, color: '#ef4444', fontWeight: '500' },
});
