// Meal photo capture + upload. Pick from the camera or library, then upload to
// Firebase Storage and return a download URL to store as MealSession.photo_url.

import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../config/firebase';

type Source = 'camera' | 'library';

async function pickFrom(source: Source): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  };

  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to take a meal photo.');
      return null;
    }
    const res = await ImagePicker.launchCameraAsync(options);
    return res.canceled ? null : res.assets[0].uri;
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Photos access needed', 'Enable photo access in Settings to attach a meal photo.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync(options);
  return res.canceled ? null : res.assets[0].uri;
}

/**
 * Prompt the user to take a photo or choose one from their library.
 * Resolves to a local file URI, or null if they cancel / deny access.
 */
export function promptForPhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert('Add a photo', 'Snap your meal or pick one from your library.', [
      { text: 'Take Photo', onPress: () => pickFrom('camera').then(resolve) },
      { text: 'Choose from Library', onPress: () => pickFrom('library').then(resolve) },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/** Upload a local image to Storage at mealPhotos/{uid}/{mealId}.jpg → download URL. */
export async function uploadMealPhoto(localUri: string, mealId: string): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `mealPhotos/${user.uid}/${mealId}.jpg`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
