import React, { useState } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { TasteRatingScreen } from './TasteRatingScreen';
import { FeelingScreen } from './FeelingScreen';
import { HowAreYouScreen } from './HowAreYouScreen';
import { HowCloseScreen } from './HowCloseScreen';
import { WhyScreen } from './WhyScreen';
import { BodyFeelingScreen } from './BodyFeelingScreen';
import { NewFoodEntry, TasteProfile, DEFAULT_TASTE_PROFILE } from '../../../types/food';
import { addFoodEntry } from '../../../services/food';
import { uploadFoodPhoto } from '../../../services/imageUpload';
// TODO: wire in generateReflectionInsight from services/aiCompanion when AI model is ready
import { useAuth } from '../../../contexts/AuthContext';
import { useFood } from '../../../contexts/FoodContext';
import { Timestamp } from 'firebase/firestore';

type Step = 'meal-name' | 'taste' | 'feeling' | 'how-are-you' | 'how-close' | 'why' | 'body';
const STEPS: Step[] = ['meal-name', 'taste', 'feeling', 'how-are-you', 'how-close', 'why', 'body'];

interface Props {
  initialMealName?: string;
  onDone: () => void;
  onBack: () => void;
}

export function ReflectionNavigator({ initialMealName = '', onDone, onBack }: Props) {
  const { user } = useAuth();
  const { refreshEntries } = useFood();

  const [step, setStep] = useState<Step>('meal-name');
  const [saving, setSaving] = useState(false);

  // Draft entry fields
  const [mealName, setMealName] = useState(initialMealName);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [calories, setCalories] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile>({ ...DEFAULT_TASTE_PROFILE });
  const [feelings, setFeelings] = useState<string[]>([]);
  const [moodRating, setMoodRating] = useState(3);
  const [howClose, setHowClose] = useState(50);
  const [reflectionText, setReflectionText] = useState('');
  const [bodyFeeling, setBodyFeeling] = useState(50);

  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length;

  const goBack = () => {
    if (stepIndex === 0) {
      onBack();
    } else {
      setStep(STEPS[stepIndex - 1]);
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const saveEntry = async (finalBodyFeeling: number) => {
    if (!user) return;
    setSaving(true);
    try {
      const entryId = `${Date.now()}`;
      let photoUrl: string | undefined;

      if (photoUri) {
        photoUrl = await uploadFoodPhoto(user.uid, entryId, photoUri);
      }

      const entry: NewFoodEntry = {
        userId: user.uid,
        date: Timestamp.now(),
        mealType,
        foodName: mealName || 'Meal',
        tasteProfile,
        moodRating,
        bodyFeeling: finalBodyFeeling,
        howClose,
        reflectionText,
        ...(photoUrl ? { photoUrl } : {}),
        ...(calories ? { calories: parseInt(calories, 10) } : {}),
      };

      await addFoodEntry(user.uid, entry);

      await refreshEntries();
      onDone();
    } catch (e) {
      console.error('Failed to save food entry:', e);
      Alert.alert('Error', 'Could not save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <SafeAreaView style={styles.loader}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loaderText}>Saving your entry…</Text>
      </SafeAreaView>
    );
  }

  if (step === 'meal-name') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log meal</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>What did you eat?</Text>

          {/* Photo */}
          <TouchableOpacity style={styles.photoArea} onPress={pickPhoto} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={32} color="#94a3b8" />
                <Text style={styles.photoHint}>Add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} activeOpacity={0.8}>
              <Ionicons name="camera" size={16} color="#6366f1" />
              <Text style={styles.photoBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.8}>
              <Ionicons name="images" size={16} color="#6366f1" />
              <Text style={styles.photoBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.nameInput}
            placeholder="Meal name (e.g. Ramen, Caesar salad)"
            placeholderTextColor="#94a3b8"
            value={mealName}
            onChangeText={setMealName}
          />

          {/* Meal type chips */}
          <View style={styles.typeChips}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setMealType(t)}
                style={[styles.typeChip, mealType === t && styles.typeChipActive]}
                activeOpacity={0.8}>
                <Text style={[styles.typeChipText, mealType === t && styles.typeChipTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.calInput}
            placeholder="Calories (optional)"
            placeholderTextColor="#94a3b8"
            value={calories}
            onChangeText={setCalories}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.btn, !mealName.trim() && styles.btnDisabled]}
            onPress={() => setStep('taste')}
            disabled={!mealName.trim()}
            activeOpacity={0.85}>
            <Text style={styles.btnText}>Reflect on this meal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'taste') {
    return (
      <TasteRatingScreen
        step={stepIndex}
        totalSteps={totalSteps}
        foodName={mealName}
        onBack={goBack}
        onNext={(taste) => { setTasteProfile(taste); setStep('feeling'); }}
      />
    );
  }

  if (step === 'feeling') {
    return (
      <FeelingScreen
        step={stepIndex}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={(f) => { setFeelings(f); setStep('how-are-you'); }}
      />
    );
  }

  if (step === 'how-are-you') {
    return (
      <HowAreYouScreen
        step={stepIndex}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={(r) => { setMoodRating(r); setStep('how-close'); }}
      />
    );
  }

  if (step === 'how-close') {
    return (
      <HowCloseScreen
        step={stepIndex}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={(v) => { setHowClose(v); setStep('why'); }}
      />
    );
  }

  if (step === 'why') {
    return (
      <WhyScreen
        step={stepIndex}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={(t) => { setReflectionText(t); setStep('body'); }}
      />
    );
  }

  if (step === 'body') {
    return (
      <BodyFeelingScreen
        step={stepIndex}
        totalSteps={totalSteps}
        onBack={goBack}
        onNext={saveEntry}
      />
    );
  }

  return null;
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
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  photoArea: { marginBottom: 12 },
  photo: { width: '100%', height: 200, borderRadius: 16 },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoHint: { fontSize: 14, color: '#94a3b8' },
  photoButtons: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  photoBtnText: { fontSize: 13, color: '#6366f1', fontWeight: '500' },
  nameInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 14,
  },
  typeChips: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeChip: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
  },
  typeChipActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  typeChipText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  typeChipTextActive: { color: '#6366f1' },
  calInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  footer: { padding: 24 },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { backgroundColor: '#c7d2fe' },
  btnText: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
});
