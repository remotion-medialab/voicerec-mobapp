import { Audio } from 'expo-av';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Lean recording service scoped to meal reflections.
 * No AsyncStorage / session management — each reflection recording is
 * immediately uploaded and discarded locally.
 */
class ReflectionRecordingService {
  private recording: Audio.Recording | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }
      return status === 'granted';
    } catch {
      return false;
    }
  }

  async startRecording(): Promise<void> {
    // Stop any in-progress recording first
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {}
      this.recording = null;
    }

    await new Promise((r) => setTimeout(r, 100));

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    this.recording = recording;
  }

  async stopRecording(): Promise<string | null> {
    if (!this.recording) return null;
    try {
      const status = await this.recording.getStatusAsync();
      if (status.isRecording) {
        await this.recording.stopAndUnloadAsync();
      }
    } catch {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {}
    }
    const uri = this.recording.getURI();
    this.recording = null;
    return uri;
  }

  /**
   * Upload a local recording to Firebase Storage.
   * Path: reflectionRecordings/{userId}/{timestamp}.m4a              
   * Uses the same top-level path as meal image uploads (covered by existing Storage rules).
   */
  async uploadRecording(localUri: string, userId: string): Promise<string> {
    const filename = `reflectionRecordings/${userId}/${Date.now()}.m4a`;
    const storageRef = ref(storage, filename);
    const response = await fetch(localUri);
    const blob = await response.blob();
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  }

  isRecording(): boolean {
    return this.recording !== null;
  }

  async getStatus(): Promise<Audio.RecordingStatus | null> {
    if (!this.recording) return null;
    try {
      return await this.recording.getStatusAsync();
    } catch {
      this.recording = null;
      return null;
    }
  }
}

export const reflectionRecordingService = new ReflectionRecordingService();
