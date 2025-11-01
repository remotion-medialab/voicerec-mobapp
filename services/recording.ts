import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { storage, db, auth } from '../config/firebase';

export interface RecordingMetadata {
  recordingId?: string;
  userId: string;
  title: string;
  duration: number;
  fileUrl: string;
  createdAt: any;
  metadata: {
    location?: {
      latitude: number;
      longitude: number;
    };
    deviceInfo: {
      platform: string;
      model?: string;
      osVersion?: string;
    };
  };
  activitySummary?: {
    primaryActivity: string;
    confidence: number;
    transitions: {
      from: string;
      to: string;
      timestamp: any;
    }[];
  };
}

class RecordingService {
  private recording: Audio.Recording | null = null;
  private recordingUri: string | null = null;
  private permissionsGranted: boolean = false;

  // Request and check audio permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      this.permissionsGranted = status === 'granted';

      if (this.permissionsGranted) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }

      return this.permissionsGranted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  // Start recording audio
  async startRecording(): Promise<void> {
    try {
      if (!this.permissionsGranted) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Audio recording permissions not granted');
        }
      }

      // Stop any existing recording and ensure it's fully stopped
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (error) {
          console.warn('Error stopping existing recording:', error);
        }
        this.recording = null;
      }

      // Add a small delay to ensure MediaRecorder state is reset (especially important for web)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create and start new recording with retry mechanism for web
      let recording: Audio.Recording | null = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // On web, we might need to use a different approach
          const isWeb = typeof window !== 'undefined';
          const options = isWeb
            ? {
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                web: {
                  mimeType: 'audio/webm',
                },
              }
            : Audio.RecordingOptionsPresets.HIGH_QUALITY;

          const result = await Audio.Recording.createAsync(options);
          recording = result.recording;
          break;
        } catch (error) {
          retryCount++;
          console.warn(`Recording creation attempt ${retryCount} failed:`, error);
          if (retryCount >= maxRetries) {
            throw error;
          }
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 200 * retryCount));
        }
      }

      if (!recording) {
        throw new Error('Failed to create recording after multiple attempts');
      }

      this.recording = recording;

      // Check if recording is already active before starting
      try {
        const status = await this.recording.getStatusAsync();

        if (status.isRecording) {
          // On web, if it's already recording, treat it as success
          const isWeb = typeof window !== 'undefined';
          if (isWeb) {
            return; // Don't throw error, treat as success
          }
        } else {
          // Actually start the recording
          await this.recording.startAsync();
        }
      } catch (statusError) {
        console.warn('Could not check recording status, attempting to start anyway:', statusError);
        try {
          await this.recording.startAsync();
        } catch (startError) {
          console.error('Failed to start recording:', startError);

          // On web, if start fails but we have a recording object, treat it as success
          const isWeb = typeof window !== 'undefined';
          if (isWeb && this.recording) {
            return; // Don't throw error, treat as success
          }

          throw startError;
        }
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      // Reset recording state on error
      this.recording = null;
      throw error;
    }
  }

  // Stop recording and get URI
  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        return null;
      }

      // Check if recording is actually recording before stopping
      try {
        const status = await this.recording.getStatusAsync();
        if (status.isRecording) {
          await this.recording.stopAndUnloadAsync();
        }
      } catch (error) {
        console.warn('Error checking recording status or stopping:', error);
        // Try to stop anyway
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (stopError) {
          console.warn('Failed to stop recording:', stopError);
        }
      }

      const uri = this.recording.getURI();
      this.recordingUri = uri;
      this.recording = null;

      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      // Reset recording state on error
      this.recording = null;
      throw error;
    }
  }

  // Upload recording to Firebase Storage
  async uploadRecording(localUri: string, recordingId: string): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Read file as blob
      const response = await fetch(localUri);
      const blob = await response.blob();

      // Create storage reference using UID - standardized path format
      const fileName = `recording_${recordingId}.m4a`;
      const storageRef = ref(storage, `recordings/${user.uid}/${fileName}`);

      console.log(`📤 Uploading to Firebase Storage: recordings/${user.uid}/${fileName}`);

      // Upload file
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadUrl = await getDownloadURL(storageRef);

      console.log(`✅ Upload successful, download URL: ${downloadUrl}`);
      return downloadUrl;
    } catch (error) {
      console.error('Error uploading recording:', error);
      throw error;
    }
  }

  // Helper method to get user profile
  private async getUserProfile(uid: string): Promise<any> {
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Save recording metadata to Firestore
  async saveRecordingMetadata(
    metadata: Omit<RecordingMetadata, 'recordingId' | 'createdAt'>
  ): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Add to user's recordings collection using UID
      const recordingsRef = collection(db, 'recordings', user.uid, 'sessions');
      const docRef = await addDoc(recordingsRef, {
        ...metadata,
        createdAt: serverTimestamp(),
      });

      return docRef.id;
    } catch (error) {
      console.error('Error saving recording metadata:', error);
      throw error;
    }
  }

  // Save recording locally to AsyncStorage (instant)
  async saveRecordingLocally(
    title: string,
    duration: number,
    stepNumber: number,
    localUri: string,
    activitySummary: RecordingMetadata['activitySummary'] | undefined,
    question: string | undefined,
    sessionNumber: number,
    goalId?: string
  ): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const recordingId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const localRecording = {
        id: recordingId,
        userId: user.uid,
        title,
        duration,
        stepNumber,
        question, // Include the question text
        audioUri: localUri,
        fileUrl: '', // Will be updated when uploaded to cloud
        sessionNumber,
        goalId, // ID of the linked goal, or undefined for "Miscellaneous"
        metadata: {
          deviceInfo: {
            platform: 'mobile',
          },
        },
        activitySummary,
        createdAt: new Date().toISOString(),
        isLocal: true, // Flag to identify local recordings
      };

      // Save to AsyncStorage instantly
      const existingRecordings = await this.getLocalRecordings();
      const updatedRecordings = [localRecording, ...existingRecordings];
      await AsyncStorage.setItem('local_recordings', JSON.stringify(updatedRecordings));

      console.log(`💾 Recording saved locally to AsyncStorage: ${title}`);
      return recordingId;
    } catch (error) {
      console.error('Error saving recording to AsyncStorage:', error);
      throw error;
    }
  }

  // Get local recordings from AsyncStorage
  async getLocalRecordings(): Promise<any[]> {
    try {
      const stored = await AsyncStorage.getItem('local_recordings');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting local recordings:', error);
      return [];
    }
  }

  async getLocalRecordingsBySession(sessionNumber: number): Promise<any[]> {
    const all = await this.getLocalRecordings();
    return all.filter((r) => r.sessionNumber === sessionNumber);
  }

  async clearLocalRecordings(): Promise<void> {
    try {
      await AsyncStorage.removeItem('local_recordings');
      console.log('🧹 Cleared local recordings from AsyncStorage');
    } catch (error) {
      console.error('Error clearing local recordings:', error);
    }
  }

  async clearLocalRecordingsForSession(sessionNumber: number): Promise<void> {
    try {
      const all = await this.getLocalRecordings();
      const remaining = all.filter((r) => r.sessionNumber !== sessionNumber);
      await AsyncStorage.setItem('local_recordings', JSON.stringify(remaining));
      console.log(`🧹 Cleared local recordings for session ${sessionNumber}`);
    } catch (error) {
      console.error('Error clearing local recordings for session:', error);
    }
  }

  // Create Firestore document for cloud upload (separate from local save)
  async createCloudRecording(
    title: string,
    duration: number,
    stepNumber: number,
    localUri: string,
    activitySummary?: RecordingMetadata['activitySummary'],
    goalId?: string
  ): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate a recordingId that matches Firebase Storage filename pattern
      const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add to user's recordings collection using UID
      const recordingsRef = collection(db, 'recordings', user.uid, 'sessions');
      const docRef = await addDoc(recordingsRef, {
        userId: user.uid,
        recordingId, // For Firebase function to find the document
        title,
        duration,
        stepNumber,
        audioUri: localUri, // Save local URI for immediate playback
        fileUrl: '', // Will be updated when uploaded to cloud
        goalId, // ID of the linked goal, or undefined for "Miscellaneous"
        metadata: {
          deviceInfo: {
            platform: 'mobile',
          },
        },
        activitySummary,
        createdAt: serverTimestamp(),
        transcriptionStatus: 'pending', // Tracks transcription state
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating cloud recording:', error);
      throw error;
    }
  }

  // Complete recording process (stop, upload, save metadata)
  async completeRecording(
    title: string,
    duration: number,
    activitySummary?: RecordingMetadata['activitySummary']
  ): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Stop recording and get URI
      const uri = await this.stopRecording();
      if (!uri) {
        throw new Error('No recording to save');
      }

      // Generate recording ID
      const recordingId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Upload to Firebase Storage
      const fileUrl = await this.uploadRecording(uri, recordingId);

      // Prepare metadata
      const metadata: Omit<RecordingMetadata, 'recordingId' | 'createdAt'> = {
        userId: user.uid,
        title,
        duration,
        fileUrl,
        metadata: {
          deviceInfo: {
            platform: 'mobile', // Will be updated with actual platform info
          },
        },
        activitySummary,
      };

      // Save to Firestore
      const docId = await this.saveRecordingMetadata(metadata);

      // Delete local file (skip on web since FileSystem.deleteAsync is not available)
      const isWeb = typeof window !== 'undefined';
      if (!isWeb) {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch (error) {
          console.warn('Could not delete local recording file:', error);
        }
      } else {
        console.log('🌐 Web platform: Skipping local file deletion (not supported)');
      }

      return docId;
    } catch (error) {
      console.error('Error completing recording:', error);
      throw error;
    }
  }

  // Check if currently recording
  isRecording(): boolean {
    return this.recording !== null;
  }

  // Get recording status with error handling
  async getRecordingStatus(): Promise<Audio.RecordingStatus | null> {
    if (!this.recording) {
      return null;
    }

    try {
      return await this.recording.getStatusAsync();
    } catch (error) {
      console.error('Error getting recording status:', error);
      // If we can't get status, assume recording is not active
      this.recording = null;
      return null;
    }
  }
}

export const recordingService = new RecordingService();
