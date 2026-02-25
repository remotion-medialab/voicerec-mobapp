import { Audio } from 'expo-av';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../config/firebase';

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
   * Upload a recording to Firebase Storage at the session/step path and create
   * a Firestore recording doc with transcriptionStatus: 'pending' so the backend
   * Cloud Function can pick it up.
   *
   * Storage path:  recordings/{userId}/session{N}/step-{stepNumber}.m4a
   * Firestore doc: users/{userId}/sessions/session{N}/recordings/step-{stepNumber}
   */
  async uploadRecordingWithFirestore(
    localUri: string,
    userId: string,
    sessionNumber: number,
    stepNumber: number,
    question: string,
    durationSec: number
  ): Promise<{ downloadURL: string }> {
    // 1. Upload audio to Firebase Storage
    const storagePath = `recordings/${userId}/session${sessionNumber}/step-${stepNumber}.m4a`;
    const storageRef = ref(storage, storagePath);
    const response = await fetch(localUri);
    const blob = await response.blob();
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    // 2. Ensure parent session doc exists
    const sessionDocRef = doc(db, 'users', userId, 'sessions', `session${sessionNumber}`);
    const existing = await getDoc(sessionDocRef);
    if (!existing.exists()) {
      await setDoc(sessionDocRef, {
        userId,
        sessionNumber,
        createdAt: serverTimestamp(),
        isComplete: false,
        reflectionStatus: 0,
      });
    }

    // 3. Create/upsert recording doc — setting transcriptionStatus: 'pending' triggers
    //    the backend Cloud Function to transcribe the audio.
    const recordingDocRef = doc(sessionDocRef, 'recordings', `step-${stepNumber}`);
    await setDoc(
      recordingDocRef,
      {
        userId,
        sessionNumber,
        recordingId: `session${sessionNumber}_step-${stepNumber}`,
        stepNumber,
        question,
        audioUri: downloadURL,
        fileUrl: downloadURL,
        storagePath,
        duration: durationSec,
        metadata: { deviceInfo: { platform: 'mobile' } },
        createdAt: serverTimestamp(),
        transcriptionStatus: 'pending',
      },
      { merge: true }
    );

    return { downloadURL };
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
