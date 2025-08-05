import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, setDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
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

      // Stop any existing recording
      if (this.recording) {
        await this.stopRecording();
      }

      // Create and start new recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      
      // Actually start the recording
      await this.recording.startAsync();
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  // Stop recording and get URI
  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recordingUri = uri;
      this.recording = null;

      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  // Get recording status
  async getRecordingStatus(): Promise<Audio.RecordingStatus | null> {
    if (!this.recording) {
      return null;
    }

    try {
      return await this.recording.getStatusAsync();
    } catch (error) {
      console.error('Error getting recording status:', error);
      return null;
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
    activitySummary?: RecordingMetadata['activitySummary'],
    question?: string
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
  
  // Create Firestore document for cloud upload (separate from local save)
  async createCloudRecording(
    title: string,
    duration: number,
    stepNumber: number,
    localUri: string,
    activitySummary?: RecordingMetadata['activitySummary']
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

      // Delete local file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (error) {
        console.warn('Could not delete local recording file:', error);
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
}

export const recordingService = new RecordingService();
