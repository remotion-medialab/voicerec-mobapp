import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { estimateCalories } from '../../services/visionAIService';

interface MealPhotoScreenProps {
  onBack: () => void;
  onNext: (
    imageUri: string,
    imageBase64: string,
    mediaType: string,
    calories: number,
    breakdown: string
  ) => void;
}

export const MealPhotoScreen: React.FC<MealPhotoScreenProps> = ({ onBack, onNext }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>('image/jpeg');
  const [analyzing, setAnalyzing] = useState(false);
  const [calories, setCalories] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean) => {
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant photo access to continue.');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 || null);
      const mt = asset.mimeType || 'image/jpeg';
      setMediaType(mt);
      setCalories(null);
      setBreakdown(null);
      setConfidence(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    try {
      const result = await estimateCalories(imageBase64, mediaType);
      setCalories(result.estimatedCalories);
      setBreakdown(result.breakdown);
      setConfidence(result.confidence);
    } catch (err) {
      Alert.alert('Analysis failed', 'Could not analyze the photo. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleContinue = () => {
    if (!imageUri || !imageBase64 || calories === null || breakdown === null) return;
    onNext(imageUri, imageBase64, mediaType, calories, breakdown);
  };

  const confidenceColor =
    confidence === 'high' ? '#22c55e' : confidence === 'medium' ? '#f59e0b' : '#ef4444';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Photo Your Meal</Text>

      <View style={styles.photoButtons}>
        <TouchableOpacity style={styles.photoButton} onPress={() => pickImage(true)} activeOpacity={0.8}>
          <Text style={styles.photoButtonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={() => pickImage(false)} activeOpacity={0.8}>
          <Text style={styles.photoButtonText}>Choose from Library</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
      )}

      {imageUri && calories === null && (
        <TouchableOpacity
          style={[styles.analyzeButton, analyzing && styles.buttonDisabled]}
          onPress={handleAnalyze}
          disabled={analyzing}
          activeOpacity={0.8}>
          {analyzing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.analyzeButtonText}>Analyze Calories</Text>
          )}
        </TouchableOpacity>
      )}

      {calories !== null && breakdown && (
        <View style={styles.resultCard}>
          <Text style={styles.caloriesText}>{calories} kcal</Text>
          <Text style={styles.breakdownText}>{breakdown}</Text>
          {confidence && (
            <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '20' }]}>
              <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                {confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence
              </Text>
            </View>
          )}

          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}>
              <Text style={styles.continueButtonText}>Looks right, continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => {
                setImageUri(null);
                setImageBase64(null);
                setCalories(null);
                setBreakdown(null);
                setConfidence(null);
              }}
              activeOpacity={0.8}>
              <Text style={styles.retakeButtonText}>Re-take photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 32,
  },
  photoButtons: { gap: 12, marginBottom: 24 },
  photoButton: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  photoButtonText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  thumbnail: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 24,
  },
  analyzeButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  analyzeButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  resultCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },
  caloriesText: { fontSize: 28, fontWeight: '700', color: '#111827', textAlign: 'center' },
  breakdownText: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  confidenceBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  confidenceText: { fontSize: 12, fontWeight: '600' },
  resultActions: { gap: 12, marginTop: 8 },
  continueButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  retakeButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retakeButtonText: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
});
