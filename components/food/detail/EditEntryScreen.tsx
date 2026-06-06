import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { FoodEntry } from '../../../types/food';
import { updateFoodEntry } from '../../../services/food';
import { useAuth } from '../../../contexts/AuthContext';
import { useFood } from '../../../contexts/FoodContext';

interface Props {
  entry: FoodEntry;
  onDone: () => void;
  onBack: () => void;
}

export function EditEntryScreen({ entry, onDone, onBack }: Props) {
  const { user } = useAuth();
  const { refreshEntries } = useFood();
  const [saving, setSaving] = useState(false);

  const [foodName, setFoodName] = useState(entry.foodName);
  const [calories, setCalories] = useState(entry.calories?.toString() ?? '');
  const [moodRating, setMoodRating] = useState(entry.moodRating);
  const [howClose, setHowClose] = useState(entry.howClose);
  const [bodyFeeling, setBodyFeeling] = useState(entry.bodyFeeling);
  const [reflectionText, setReflectionText] = useState(entry.reflectionText);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateFoodEntry(user.uid, entry.id, {
        foodName,
        calories: calories ? parseInt(calories, 10) : undefined,
        moodRating,
        howClose,
        bodyFeeling,
        reflectionText,
      });
      await refreshEntries();
      onDone();
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <SafeAreaView style={styles.loader}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loaderText}>Saving…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fix anything</Text>
        <TouchableOpacity onPress={save} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.saveBtn}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Meal name</Text>
        <TextInput
          style={styles.input}
          value={foodName}
          onChangeText={setFoodName}
          placeholder="e.g. Ramen"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Calories</Text>
        <TextInput
          style={styles.input}
          value={calories}
          onChangeText={setCalories}
          keyboardType="numeric"
          placeholder="Optional"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Mood rating: {moodRating}/6</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={6}
          step={1}
          value={moodRating}
          onValueChange={setMoodRating}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#e2e8f0"
          thumbTintColor="#6366f1"
        />

        <Text style={styles.label}>How close was it: {howClose}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={howClose}
          onValueChange={setHowClose}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#e2e8f0"
          thumbTintColor="#6366f1"
        />

        <Text style={styles.label}>Body feeling: {bodyFeeling}%</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          step={1}
          value={bodyFeeling}
          onValueChange={setBodyFeeling}
          minimumTrackTintColor="#6366f1"
          maximumTrackTintColor="#e2e8f0"
          thumbTintColor="#6366f1"
        />

        <Text style={styles.label}>Reflection</Text>
        <TextInput
          style={styles.textArea}
          value={reflectionText}
          onChangeText={setReflectionText}
          multiline
          placeholder="Any thoughts about this meal?"
          placeholderTextColor="#94a3b8"
          textAlignVertical="top"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loaderText: { marginTop: 16, fontSize: 15, color: '#64748b' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  saveBtn: { fontSize: 15, fontWeight: '600', color: '#6366f1' },
  scroll: { flex: 1 },
  content: { padding: 24, gap: 8, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 4 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  slider: { width: '100%', height: 40, marginBottom: 16 },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    minHeight: 120,
    marginBottom: 16,
  },
});
