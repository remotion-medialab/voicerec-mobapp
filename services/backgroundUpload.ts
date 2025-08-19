import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordingService } from './recording';
import { sensorService } from './sensors';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { storage, db, auth } from '../config/firebase';
import * as FileSystem from 'expo-file-system';

interface PendingUpload {
  id: string;
  recordingUri: string;
  metadata: {
    title: string;
    duration: number;
    stepNumber: number;
    activitySummary?: any;
    question?: string;
  };
  timestamp: number;
  // Sequential session number
  sessionNumber: number;
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
    sessionNumber: number,
    activitySummary?: any,
    question?: string
  ): Promise<string> {
    // Check if this recording is already queued
    const existingUpload = this.uploadQueue.find(
      (upload) =>
        upload.recordingUri === recordingUri ||
        (upload.metadata.title === title && upload.metadata.stepNumber === stepNumber)
    );

    if (existingUpload) {
      console.log(`Recording already queued, skipping duplicate: ${title}`);
      return existingUpload.id;
    }

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
      },
      timestamp: Date.now(),
      sessionNumber,
    };

    // Add to queue but DON'T process yet
    this.uploadQueue.push(pendingUpload);

    // Save queue to storage
    await this.saveQueueToStorage();

    console.log(
      `📋 Recording queued for later upload: ${title} (Total queue: ${this.uploadQueue.length})`
    );

    return uploadId;
  }

  // Add recording to upload queue and process immediately
  async queueUpload(
    recordingUri: string,
    title: string,
    duration: number,
    stepNumber: number,
    sessionNumber: number,
    activitySummary?: any,
    question?: string
  ): Promise<string> {
    const uploadId = await this.queueForLater(
      recordingUri,
      title,
      duration,
      stepNumber,
      sessionNumber,
      activitySummary,
      question
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
  private async uploadToFirebaseStorage(localUri: string, upload: PendingUpload): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Read the file from local storage
      const response = await fetch(localUri);
      const blob = await response.blob();

      // Create Firebase Storage reference using UID
      const stepIndex = upload.metadata.stepNumber ?? 0; // 0..4
      const fileName = `step-${stepIndex}.m4a`;
      const storageRef = ref(
        storage,
        `recordings/${user.uid}/session${upload.sessionNumber}/${fileName}`
      );

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

      // Ensure parent session doc exists at users/{uid}/sessions/{N}
      const sessionDocRef = doc(
        db,
        'users',
        user.uid,
        'sessions',
        `session${upload.sessionNumber}`
      );
      const existing = await getDoc(sessionDocRef);
      if (!existing.exists()) {
        await setDoc(sessionDocRef, {
          userId: user.uid,
          sessionNumber: upload.sessionNumber,
          createdAt: serverTimestamp(),
          isComplete: false,
        });
      }

      // Create/overwrite recording document with deterministic ID 'step-{0..4}'
      const stepIndex = upload.metadata.stepNumber ?? 0;
      const docRef = doc(sessionDocRef, 'recordings', `step-${stepIndex}`);
      const computedFileName = `step-${stepIndex}.m4a`;
      const storagePath = `recordings/${user.uid}/session${upload.sessionNumber}/${computedFileName}`;
      await setDoc(
        docRef,
        {
          userId: user.uid,
          sessionNumber: upload.sessionNumber,
          recordingId: `session${upload.sessionNumber}_step-${stepIndex}`,
          title: upload.metadata.title,
          duration: upload.metadata.duration,
          stepNumber: stepIndex,
          question: upload.metadata.question, // Include the question text
          audioUri: downloadURL, // Cloud URL for playback
          fileUrl: downloadURL,
          storagePath,
          metadata: {
            deviceInfo: {
              platform: 'mobile',
            },
          },
          activitySummary: upload.metadata.activitySummary,
          createdAt: serverTimestamp(),
          transcriptionStatus: 'pending', // Tracks transcription state
        },
        { merge: true }
      );

      console.log(`📝 Firestore document created: ${docRef.id}`);

      // Determine required steps based on user condition: A => 1 step, else 5 steps
      const profile = await this.getUserProfile(user.uid);
      const totalSteps = profile?.condition === 'A' ? 1 : 5;

      // If this was the last required step, mark session as complete
      if ((upload.metadata.stepNumber ?? 0) === totalSteps - 1) {
        await updateDoc(sessionDocRef, {
          isComplete: true,
          completedAt: serverTimestamp(),
        });
      }
      return docRef.id;
    } catch (error) {
      console.error('Error creating Firestore record:', error);
      throw error;
    }
  }

  // Update local AsyncStorage record with Firebase Storage URL
  private async updateLocalRecordingWithURL(
    upload: PendingUpload,
    downloadURL: string
  ): Promise<void> {
    try {
      const localRecordings = await recordingService.getLocalRecordings();

      // Find and update the matching recording
      const updatedRecordings = localRecordings.map((recording: any) => {
        if (
          recording.title === upload.metadata.title &&
          recording.stepNumber === upload.metadata.stepNumber
        ) {
          return {
            ...recording,
            fileUrl: downloadURL,
            audioUri: downloadURL, // Update both for compatibility
          };
        }
        return recording;
      });

      // Save back to AsyncStorage
      await AsyncStorage.setItem('local_recordings', JSON.stringify(updatedRecordings));
      console.log(`📱 Updated local recording with cloud URL: ${upload.metadata.title}`);
    } catch (error) {
      console.error('Error updating local recording with URL:', error);
      // Don't throw - this is not critical for the upload process
    }
  }

  // Process upload queue (one at a time)
  private async processQueue(): Promise<void> {
    if (this.isUploading || this.uploadQueue.length === 0) {
      return;
    }

    this.isUploading = true;

    while (this.uploadQueue.length > 0) {
      const upload = this.uploadQueue[0];

      try {
        console.log(`🔄 Uploading recording: ${upload.metadata.title}`);
        console.log(`📁 Local file: ${upload.recordingUri}`);
        console.log(`📊 Duration: ${upload.metadata.duration}s`);
        console.log(
          `🏃 Activity: ${upload.metadata.activitySummary?.primaryActivity || 'unknown'}`
        );

        // 1. Upload audio file to Firebase Storage
        const downloadURL = await this.uploadToFirebaseStorage(upload.recordingUri, upload);

        // 2. Create Firestore document with download URL
        const firestoreDocId = await this.createFirestoreRecord(upload, downloadURL);

        // 3. Update local AsyncStorage record with download URL
        await this.updateLocalRecordingWithURL(upload, downloadURL);

        // 4. Clean up local file
        try {
          await FileSystem.deleteAsync(upload.recordingUri, { idempotent: true });
          console.log(`🗑️ Local file deleted: ${upload.recordingUri}`);
        } catch (cleanupError) {
          console.error('Error deleting local file:', cleanupError);
          // Continue anyway - upload was successful
        }

        // Remove successful upload from queue
        this.uploadQueue.shift();
        await this.saveQueueToStorage();

        console.log(`✅ Upload completed: ${upload.metadata.title}`);
        console.log(`📥 Download URL: ${downloadURL}`);
      } catch (error) {
        console.error(`❌ Upload failed for ${upload.metadata.title}:`, error);

        // For now, remove failed uploads to prevent infinite retries
        // In production, you might want to implement retry logic
        this.uploadQueue.shift();
        await this.saveQueueToStorage();

        // Small delay before next attempt
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    this.isUploading = false;
  }

  // Get current upload status
  getUploadStatus(): {
    pending: number;
    isUploading: boolean;
    currentUpload?: string;
  } {
    return {
      pending: this.uploadQueue.length,
      isUploading: this.isUploading,
      currentUpload:
        this.isUploading && this.uploadQueue.length > 0
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
        const loadedQueue = JSON.parse(stored);

        // Remove duplicates by recordingUri and title+stepNumber
        const uniqueUploads = new Map<string, PendingUpload>();

        loadedQueue.forEach((upload: PendingUpload) => {
          const key = `${upload.recordingUri}_${upload.metadata.title}_${upload.metadata.stepNumber}`;
          if (!uniqueUploads.has(key)) {
            uniqueUploads.set(key, upload);
          }
        });

        this.uploadQueue = Array.from(uniqueUploads.values());

        // Don't auto-process on load - wait for user to trigger uploads
        console.log(
          `📋 Loaded ${this.uploadQueue.length} unique uploads from storage (removed ${loadedQueue.length - this.uploadQueue.length} duplicates)`
        );

        // Save the deduplicated queue back to storage
        if (loadedQueue.length !== this.uploadQueue.length) {
          await this.saveQueueToStorage();
        }
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
    console.log('📋 Upload queue cleared');
  }

  // Remove duplicates from current queue manually (for cleaning up existing issues)
  async deduplicateQueue(): Promise<void> {
    const originalLength = this.uploadQueue.length;

    const uniqueUploads = new Map<string, PendingUpload>();

    this.uploadQueue.forEach((upload) => {
      const key = `${upload.recordingUri}_${upload.metadata.title}_${upload.metadata.stepNumber}`;
      if (!uniqueUploads.has(key)) {
        uniqueUploads.set(key, upload);
      }
    });

    this.uploadQueue = Array.from(uniqueUploads.values());
    await this.saveQueueToStorage();

    console.log(
      `Deduplicated queue: ${originalLength} → ${this.uploadQueue.length} (removed ${originalLength - this.uploadQueue.length} duplicates)`
    );
  }

  // Retry failed uploads
  async retryUploads(): Promise<void> {
    if (!this.isUploading && this.uploadQueue.length > 0) {
      this.processQueue();
    }
  }
}

export const backgroundUploadService = new BackgroundUploadService();
