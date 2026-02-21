import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { recommendFromMenu } from '../../services/visionAIService';

export interface MenuResult {
  items: string[];
  rationale: string;
  alternatives: string;
  menuImageUrl?: string;
  intention: string;
}

interface EatOutScreenProps {
  onBack: () => void;
  onRecommendation: (result: MenuResult) => void;
}

const INTENTION_CHIPS = ['Feel energized', 'High protein', 'Lighter meal', 'Comfort food', 'Focus'];

export const EatOutScreen: React.FC<EatOutScreenProps> = ({ onBack, onRecommendation }) => {
  const { userProfile } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>('image/jpeg');
  const [intention, setIntention] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = imageUri && intention.trim();

  const pickMenuPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant photo access to continue.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 || null);
      setMediaType(asset.mimeType || 'image/jpeg');
    }
  };

  const takeMenuPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant camera access to continue.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 || null);
      setMediaType(asset.mimeType || 'image/jpeg');
    }
  };

  const handleGetRecommendation = async () => {
    if (!imageBase64 || !intention.trim()) return;
    setLoading(true);
    try {
      const result = await recommendFromMenu(
        imageBase64,
        mediaType,
        intention.trim(),
        userProfile?.dietGoal || ''
      );
      onRecommendation({ ...result, menuImageUrl: imageUri || undefined, intention: intention.trim() });
    } catch (err) {
      Alert.alert('Error', 'Could not get a recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleChip = (chip: string) => {
    setIntention(chip === intention ? '' : chip);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Eat Out</Text>

      <Text style={styles.label}>Upload menu photo</Text>
      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.photoButton} onPress={takeMenuPhoto} activeOpacity={0.8}>
          <Text style={styles.photoButtonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={pickMenuPhoto} activeOpacity={0.8}>
          <Text style={styles.photoButtonText}>Choose from Library</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
      )}

      <Text style={styles.label}>What do you want from this meal?</Text>
      <View style={styles.chipsRow}>
        {INTENTION_CHIPS.map((chip) => (
          <TouchableOpacity
            key={chip}
            style={[styles.chip, intention === chip && styles.chipSelected]}
            onPress={() => toggleChip(chip)}
            activeOpacity={0.7}>
            <Text style={[styles.chipText, intention === chip && styles.chipTextSelected]}>
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Or describe in your own words..."
        value={intention}
        onChangeText={setIntention}
        placeholderTextColor="#9ca3af"
      />

      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleGetRecommendation}
        disabled={!canSubmit || loading}
        activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Get Recommendation</Text>
        )}
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
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 28 },
  label: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10 },
  photoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  photoButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoButtonText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  thumbnail: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 24,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: '#f9fafb',
  },
  chipSelected: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 13, color: '#6b7280' },
  chipTextSelected: { color: '#2563eb', fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 28,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: { backgroundColor: '#93c5fd' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
