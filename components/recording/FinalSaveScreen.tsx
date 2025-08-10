import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressCircles } from './ProgressCircles';
import { backgroundUploadService } from '../../services/backgroundUpload';

interface FinalSaveScreenProps {
  onSave: () => void;
  onBack: () => void;
  onComplete: () => void;
}

export const FinalSaveScreen: React.FC<FinalSaveScreenProps> = ({ onSave, onBack, onComplete }) => {
  const [initialPendingCount, setInitialPendingCount] = useState(0);
  const [currentPendingCount, setCurrentPendingCount] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const status = backgroundUploadService.getUploadStatus();
    setInitialPendingCount(status.pending);
    setCurrentPendingCount(status.pending);
  }, []);

  useEffect(() => {
    const checkUploadStatus = () => {
      const status = backgroundUploadService.getUploadStatus();
      setCurrentPendingCount(status.pending);
      setIsUploading(status.isUploading);

      if (status.isUploading && initialPendingCount > 0) {
        // Calculate total progress based on how many files have been completed
        const completed = initialPendingCount - status.pending;
        const totalProgress = (completed / initialPendingCount) * 100;
        setUploadProgress(totalProgress);

        console.log(
          `📊 Upload progress: ${completed}/${initialPendingCount} files (${Math.round(totalProgress)}%)`
        );
      }

      if (!status.isUploading && status.pending === 0 && isUploading) {
        // Upload completed
        setIsCompleted(true);
        setUploadProgress(100);
        console.log('✅ All uploads completed successfully');
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    };

    if (isUploading) {
      const interval = setInterval(checkUploadStatus, 500);
      return () => clearInterval(interval);
    }
  }, [isUploading, initialPendingCount, onComplete]);

  const handleUpload = async () => {
    setIsUploading(true);
    onSave();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Ionicons name="home" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Thank you message */}
      <View style={styles.messageContainer}>
        <Text style={styles.thankYouText}>Thank you.</Text>
        {!isUploading && !isCompleted && (
          <>
            <Text style={styles.questionText}>
              Would you like to upload this session to the cloud?
            </Text>
            <Text style={styles.subText}>
              {initialPendingCount} recordings saved locally • Ready for secure cloud backup
            </Text>
          </>
        )}
        {isUploading && !isCompleted && (
          <>
            <Text style={styles.questionText}>Uploading to cloud...</Text>
            <Text style={styles.subText}>{Math.round(uploadProgress)}% complete</Text>
          </>
        )}
        {isCompleted && (
          <>
            <Text style={styles.questionText}>Upload complete!</Text>
            <Text style={styles.subText}>All recordings safely stored in the cloud</Text>
          </>
        )}
      </View>

      {/* Progress Circles - all completed */}
      <View style={styles.progressContainer}>
        <ProgressCircles currentStep={5} isRecording={false} />
      </View>

      {/* Upload Button */}
      <View style={styles.buttonContainer}>
        {!isUploading && !isCompleted && (
          <TouchableOpacity style={styles.saveButton} onPress={handleUpload}>
            <Text style={styles.saveButtonText}>Upload to Cloud</Text>
          </TouchableOpacity>
        )}
        {isUploading && !isCompleted && (
          <View style={styles.progressButton}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressButtonText}>
              Uploading... {Math.round(uploadProgress)}%
            </Text>
          </View>
        )}
        {isCompleted && (
          <View style={[styles.saveButton, styles.completedButton]}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={[styles.saveButtonText, styles.completedButtonText]}>Upload Complete</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  messageContainer: {
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  thankYouText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  subText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 80,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#bfdbfe',
    borderRadius: 25,
    paddingHorizontal: 40,
    paddingVertical: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  progressButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 25,
    paddingHorizontal: 40,
    paddingVertical: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  progressButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  completedButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedButtonText: {
    color: '#10b981',
  },
});
