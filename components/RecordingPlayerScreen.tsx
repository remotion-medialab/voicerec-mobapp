import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingEntry } from '../types/recording';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Audio } from 'expo-av';

interface RecordingPlayerScreenProps {
  currentRecording: RecordingEntry;
  onBack: () => void;
}

export const RecordingPlayerScreen: React.FC<RecordingPlayerScreenProps> = ({
  currentRecording,
  onBack,
}) => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackStatus, setPlaybackStatus] = useState<any>(null);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(currentRecording.id);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<RecordingEntry | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadRecordings = async () => {
      try {
        const recordingsRef = collection(db, 'recordings', user.uid, 'sessions');
        const q = query(recordingsRef, orderBy('createdAt', 'desc'));
        
        const snapshot = await getDocs(q);
        const entries: RecordingEntry[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            timestamp: data.createdAt?.toDate() || new Date(),
            duration: data.duration || 0,
            title: data.title,
            stepNumber: data.stepNumber,
            audioUri: data.audioUri || data.fileUrl,
            fileUrl: data.fileUrl,
          } as RecordingEntry;
        });

        setRecordings(entries);
      } catch (error) {
        console.error('❌ Error loading recordings in player:', error);
        setRecordings([]);
      }
    };

    loadRecordings();
  }, [user]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Set up audio mode for playback
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

        // Auto-play the current recording when screen loads
        if (currentRecording) {
          playRecording(currentRecording);
        }
      } catch (error) {
        console.error('Error setting up audio mode:', error);
      }
    };

    setupAudio();
  }, []);

  // Auto-play when currentRecording changes
  useEffect(() => {
    if (currentRecording && activeRecordingId !== currentRecording.id) {
      playRecording(currentRecording);
    }
  }, [currentRecording]);

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (timestamp.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (timestamp.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return timestamp.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `0:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatPlaybackTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const playRecording = async (recording: RecordingEntry) => {
    try {
      console.log(`🎵 Attempting to play recording: ${recording.id}`);

      // If clicking the same recording that's already active
      if (activeRecordingId === recording.id && sound) {
        if (isPlaying) {
          // Pause current playback
          await sound.pauseAsync();
          setIsPlaying(false);
          console.log('⏸️ Paused current recording');
        } else {
          // Resume playback
          await sound.playAsync();
          setIsPlaying(true);
          console.log('▶️ Resumed current recording');
        }
        return;
      }

      // Stop any current playback and switch to new recording
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setPlaybackStatus(null);
      }

      // Only use Firebase Storage URLs for playback
      let audioUri = (recording as any).fileUrl || recording.audioUri;
      
      // Skip local recordings that haven't been uploaded to Firebase Storage yet
      if (!audioUri || audioUri.startsWith('file://')) {
        Alert.alert('Recording Not Available', 'This recording needs to be uploaded to the cloud before it can be played. Please upload your recordings first.');
        return;
      }

      // Ensure it's a Firebase Storage URL
      if (!audioUri.includes('firebasestorage.googleapis.com')) {
        Alert.alert('Error', 'Invalid audio source - only cloud recordings can be played');
        return;
      }

      console.log(`🎵 Loading audio from: ${audioUri.substring(0, 100)}...`);

      // Set this as the active recording
      setActiveRecordingId(recording.id);

      // Create and play new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 100, // Update progress more frequently
          positionMillis: 0,
        }
      );

      setSound(newSound);
      setIsPlaying(true);

      // Set up playback status updates
      newSound.setOnPlaybackStatusUpdate((status) => {
        setPlaybackStatus(status);
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlaying(false);
            console.log('🏁 Playback finished');
          }
        } else if (status.error) {
          console.error('❌ Playback error:', status.error);
          setIsPlaying(false);
        }
      });

      console.log('✅ Audio loaded and playing successfully');
    } catch (error) {
      console.error('❌ Error playing recording:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      Alert.alert('Playback Error', `Failed to play recording: ${errorMessage}`);

      // Reset state on error
      setActiveRecordingId(null);
      setIsPlaying(false);
      setPlaybackStatus(null);
    }
  };

  const pauseRecording = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const seekToPosition = async (position: number) => {
    try {
      if (sound && playbackStatus?.isLoaded && playbackStatus.durationMillis) {
        const newPosition = position * playbackStatus.durationMillis;
        console.log(`⏭️ Seeking to position: ${Math.round(newPosition / 1000)}s`);
        await sound.setPositionAsync(newPosition);
      }
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const deleteRecording = (recording: RecordingEntry) => {
    setRecordingToDelete(recording);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordingToDelete) return;

    try {
      // Stop playback if this recording is currently playing
      if (activeRecordingId === recordingToDelete.id && sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        setPlaybackStatus(null);
        setActiveRecordingId(null);
      }

      // TODO: Implement actual delete functionality
      // - Delete from Firestore
      // - Delete from Firebase Storage
      // - Remove from local list

      console.log(`🗑️ Deleting recording: ${recordingToDelete.id}`);
      Alert.alert('Coming Soon', 'Delete functionality will be implemented soon');

      setShowDeleteModal(false);
      setRecordingToDelete(null);
    } catch (error) {
      console.error('Error deleting recording:', error);
      Alert.alert('Error', 'Failed to delete recording');
      setShowDeleteModal(false);
      setRecordingToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setRecordingToDelete(null);
  };

  const renderRecording = ({ item }: { item: RecordingEntry }) => {
    const isCurrentlyPlaying = activeRecordingId === item.id;

    return (
      <TouchableOpacity
        style={[styles.recordingItem, isCurrentlyPlaying && styles.activeRecording]}
        onPress={() => playRecording(item)}>
        <View
          style={[styles.recordingContent, isCurrentlyPlaying && styles.activeRecordingContent]}>
          {/* Play/Pause Button */}
          <TouchableOpacity
            style={[styles.playButton, isCurrentlyPlaying && styles.activePlayButton]}
            onPress={() => playRecording(item)}>
            <Ionicons
              name={isCurrentlyPlaying && isPlaying ? 'pause' : 'play'}
              size={20}
              color={isCurrentlyPlaying ? '#ffffff' : '#3b82f6'}
            />
          </TouchableOpacity>

          {/* Recording Info */}
          <View style={styles.recordingInfo}>
            <Text style={[styles.recordingTime, isCurrentlyPlaying && styles.activeRecordingText]}>
              {formatTime(item.timestamp)} {formatDate(item.timestamp)}
            </Text>

            {/* Progress Controls for Active Recording */}
            {isCurrentlyPlaying && playbackStatus?.isLoaded && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressTime}>
                  {formatPlaybackTime(playbackStatus.positionMillis || 0)}
                </Text>

                <TouchableOpacity
                  style={styles.progressBarContainer}
                  activeOpacity={0.8}
                  onPress={(event) => {
                    const { locationX } = event.nativeEvent;
                    // Estimate progress bar width (will be improved with layout)
                    const progressWidth = 180; // Approximate progress bar width
                    const position = locationX / progressWidth;
                    const clampedPosition = Math.max(0, Math.min(1, position));
                    console.log(`📍 Seeking to ${Math.round(clampedPosition * 100)}%`);
                    seekToPosition(clampedPosition);
                  }}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${((playbackStatus.positionMillis || 0) / (playbackStatus.durationMillis || 1)) * 100}%`,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.progressHandle,
                        {
                          left: `${((playbackStatus.positionMillis || 0) / (playbackStatus.durationMillis || 1)) * 100 - 1}%`,
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>

                <Text style={styles.progressTime}>
                  -
                  {formatPlaybackTime(
                    (playbackStatus.durationMillis || 0) - (playbackStatus.positionMillis || 0)
                  )}
                </Text>
              </View>
            )}
          </View>

          {/* Duration for inactive recordings */}
          {!isCurrentlyPlaying && (
            <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
          )}

          {/* Delete Button for Active Recording */}
          {isCurrentlyPlaying && (
            <TouchableOpacity style={styles.deleteButton} onPress={() => deleteRecording(item)}>
              <Ionicons name="trash-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Ionicons name="home" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Voice Recordings</Text>
        <Text style={styles.subtitle}>Daily voice entries • June - July 2025</Text>
      </View>

      {/* Recordings List */}
      <FlatList
        data={recordings}
        renderItem={renderRecording}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDeleteCancel}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete this recording?</Text>

            <TouchableOpacity style={styles.modalDeleteButton} onPress={handleDeleteConfirm}>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleDeleteCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  recordingItem: {
    marginBottom: 12,
  },
  recordingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeRecordingContent: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  activeRecording: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    margin: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activePlayButton: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTime: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  activeRecordingText: {
    color: '#ffffff',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  progressTime: {
    fontSize: 12,
    color: '#ffffff',
    minWidth: 35,
  },
  progressBarContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 3,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  progressHandle: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  duration: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    marginRight: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 32,
  },
  modalDeleteButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
});
