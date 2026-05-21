import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordingService } from './recording';
import { sensorService } from './sensors';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '../config/firebase';
// SDK54+: the top-level expo-file-system API is deprecated; using the legacy
// entrypoint keeps the existing deleteAsync call working without a rewrite.
import * as FileSystem from 'expo-file-system/legacy';

interface PendingUpload {
  id: string;
  recordingUri: string;
  metadata: {
    title: string;
    duration: number;
    stepNumber: number;
    activitySummary?: any;
    question?: string;
    sessionId?: string;
  };
  timestamp: number;
}

class BackgroundUploadService {
  private uploadQueue: PendingUpload[] = [];
  private isUploading = false;
  private readonly QUEUE_KEY = 'pending_uploads';

  constructor() {
    this.loadQueueFromStorage();
  }

  // Add recording to upload queue (but don't auto-upload)
  async queueForLater(
    recordingUri: string,
    title: string,
    duration: number,
    stepNumber: number,
    activitySummary?: any,
    question?: string,
    sessionId?: string
  ): Promise<string> {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pendingUpload: PendingUpload = {
      id: uploadId,
      recordingUri,
      metadata: {
        title,
        duration,
        stepNumber,
        activitySummary,
        question,
        sessionId,
      },
      timestamp: Date.now(),
    };

    // Add to queue but DON'T process yet
    this.uploadQueue.push(pendingUpload);
    
    // Save queue to storage
    await this.saveQueueToStorage();
    
    console.log(`📋 Recording queued for later upload: ${title}`);
    
    return uploadId;
  }

  // Add recording to upload queue and process immediately
  async queueUpload(
    recordingUri: string,
    title: string,
    duration: number,
    stepNumber: number,
    activitySummary?: any,
    question?: string,
    sessionId?: string
  ): Promise<string> {
    const uploadId = await this.queueForLater(
      recordingUri,
      title,
      duration,
      stepNumber,
      activitySummary,
      question,
      sessionId
    );
    
    // Start processing immediately
    this.processQueue();
    
    return uploadId;
  }

  // Start processing all queued uploads
  async startUploading(): Promise<void> {
    this.processQueue();
  }

  // Upload file to Firebase Storage and return download URL
  private async uploadToFirebaseStorage(localUri: string, uploadId: string): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Read the file from local storage
      const response = await fetch(localUri);
      const blob = await response.blob();

      // Create Firebase Storage reference using UID
      const fileName = `recording_${uploadId}.m4a`;
      const storageRef = ref(storage, `recordings/${user.uid}/${fileName}`);

      // Upload the file
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading to Firebase Storage:', error);
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

  // Create Firestore record with download URL
  private async createFirestoreRecord(upload: PendingUpload, downloadURL: string): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create new document in Firestore
      const recordingsRef = collection(db, 'recordings', user.uid, 'sessions');
      const docRef = await addDoc(recordingsRef, {
        userId: user.uid,
        title: upload.metadata.title,
        duration: upload.metadata.duration,
        stepNumber: upload.metadata.stepNumber,
        sessionId: upload.metadata.sessionId ?? null,
        question: upload.metadata.question, // Include the question text
        audioUri: downloadURL, // Cloud URL for playback
        fileUrl: downloadURL,
        metadata: {
          deviceInfo: {
            platform: 'mobile',
          },
        },
        activitySummary: upload.metadata.activitySummary,
        createdAt: serverTimestamp(),
      });

      console.log(`📝 Firestore document created: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('Error creating Firestore record:', error);
      throw error;
    }
  }

  // Update local AsyncStorage record with Firebase Storage URL via the
  // recordingService helper so the in-memory cache and AsyncStorage stay
  // in lockstep (otherwise the cache would go stale after a cloud upload).
  private async updateLocalRecordingWithURL(upload: PendingUpload, downloadURL: string): Promise<void> {
    try {
      await recordingService.updateLocalRecording(
        (r: any) =>
          r.title === upload.metadata.title && r.stepNumber === upload.metadata.stepNumber,
        { fileUrl: downloadURL, audioUri: downloadURL }
      );
      console.log(`📱 Updated local recording with cloud URL: ${upload.metadata.title}`);
    } catch (error) {
      console.error('Error updating local recording with URL:', error);
      // Don't throw — non-critical for the upload itself.
    }
  }

  // Single upload pipeline: Storage → Firestore → patch local → delete file.
  private async processOne(upload: PendingUpload): Promise<void> {
    console.log(`🔄 Uploading recording: ${upload.metadata.title}`);
    const downloadURL = await this.uploadToFirebaseStorage(upload.recordingUri, upload.id);
    await this.createFirestoreRecord(upload, downloadURL);
    await this.updateLocalRecordingWithURL(upload, downloadURL);
    try {
      await FileSystem.deleteAsync(upload.recordingUri, { idempotent: true });
    } catch (cleanupError) {
      console.error('Error deleting local file:', cleanupError);
    }
    console.log(`✅ Upload completed: ${upload.metadata.title}`);
  }

  // Tier 2 F — process the queue in parallel batches. Each batch of up to
  // CONCURRENCY uploads is removed from the queue atomically and run concurrently,
  // cutting wall-clock time of the FinalSave step by roughly Nx on Wi-Fi.
  // Same failure semantics as before: a failed upload is dropped from the queue
  // (no infinite retry loop).
  private async processQueue(): Promise<void> {
    if (this.isUploading || this.uploadQueue.length === 0) {
      return;
    }
    this.isUploading = true;
    const CONCURRENCY = 3;
    try {
      while (this.uploadQueue.length > 0) {
        const batch = this.uploadQueue.splice(0, CONCURRENCY);
        await this.saveQueueToStorage();
        await Promise.all(
          batch.map((upload) =>
            this.processOne(upload).catch((error) => {
              console.error(`❌ Upload failed for ${upload.metadata.title}:`, error);
            })
          )
        );
      }
    } finally {
      this.isUploading = false;
    }
  }

  // Get current upload status
  getUploadStatus(): { 
    pending: number; 
    isUploading: boolean; 
    currentUpload?: string 
  } {
    return {
      pending: this.uploadQueue.length,
      isUploading: this.isUploading,
      currentUpload: this.isUploading && this.uploadQueue.length > 0 
        ? this.uploadQueue[0].metadata.title 
        : undefined,
    };
  }

  // Save queue to local storage
  private async saveQueueToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.uploadQueue));
    } catch (error) {
      console.error('Failed to save upload queue:', error);
    }
  }

  // Load queue from local storage
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        this.uploadQueue = JSON.parse(stored);
        // Don't auto-process on load - wait for user to trigger uploads
        console.log(`📋 Loaded ${this.uploadQueue.length} pending uploads from storage`);
      }
    } catch (error) {
      console.error('Failed to load upload queue:', error);
      this.uploadQueue = [];
    }
  }

  // Clear all pending uploads (for testing/debugging)
  async clearQueue(): Promise<void> {
    this.uploadQueue = [];
    await AsyncStorage.removeItem(this.QUEUE_KEY);
  }

  // Retry failed uploads
  async retryUploads(): Promise<void> {
    if (!this.isUploading && this.uploadQueue.length > 0) {
      this.processQueue();
    }
  }
}

export const backgroundUploadService = new BackgroundUploadService(); 