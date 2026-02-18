import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { CounterfactualWorkflow as WorkflowData, StageCounterfactualWorkflows } from '../types/session';
import { StageAccordion } from './counterfactual/StageAccordion';

interface RecordingDetailScreenProps {
  sessionNumber: number;
  onBack: () => void;
  onComplete: () => void;
}

interface RecordingData {
  id: string;
  stepNumber: number;
  audioUri: string;
  storagePath?: string;
  duration: number;
  transcriptionText: string;
  type?: string; // 'text' for text entries, undefined for audio
  content?: string; // Text content for text entries
  title?: string; // Stage title
}

export const RecordingDetailScreen: React.FC<RecordingDetailScreenProps> = ({
  sessionNumber,
  onBack,
  onComplete,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goalName, setGoalName] = useState('');
  const [transcript, setTranscript] = useState('');
  const [recordings, setRecordings] = useState<RecordingData[]>([]);
  const [sessionDate, setSessionDate] = useState<Date | null>(null);
  const [isTextBased, setIsTextBased] = useState(false); // Track if this is a text-based session

  // Counterfactual workflows
  const [stageWorkflows, setStageWorkflows] = useState<StageCounterfactualWorkflows | null>(null);
  const [legacyWorkflow, setLegacyWorkflow] = useState<WorkflowData | null>(null);

  // Audio playback state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  const [currentRecordingIndex, setCurrentRecordingIndex] = useState(0);

  useEffect(() => {
    loadSessionData();
    // Configure audio mode for playback
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadSessionData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load session document
      const sessionRef = doc(db, 'users', user.uid, 'sessions', `session${sessionNumber}`);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        console.error('Session not found');
        Alert.alert('Error', 'Session not found');
        onBack();
        return;
      }

      const sessionData = sessionSnap.data();

      // Load goal if exists
      if (sessionData.goalId) {
        const goalRef = doc(db, 'users', user.uid, 'goals', sessionData.goalId);
        const goalSnap = await getDoc(goalRef);
        if (goalSnap.exists()) {
          setGoalName(goalSnap.data().goal);
        } else {
          setGoalName('Goal (deleted)');
        }
      } else {
        setGoalName('Miscellaneous');
      }

      // Load recordings and combine transcripts
      const recordingsRef = collection(
        db,
        'users',
        user.uid,
        'sessions',
        `session${sessionNumber}`,
        'recordings'
      );
      const recordingsSnap = await getDocs(recordingsRef);

      // Sort by step number
      const sortedDocs = recordingsSnap.docs.sort((a, b) => {
        const stepA = parseInt(a.id.split('-')[1] || '0');
        const stepB = parseInt(b.id.split('-')[1] || '0');
        return stepA - stepB;
      });

      // Build recordings array with audio URLs or text content
      const recordingsData: RecordingData[] = sortedDocs.map((recDoc) => {
        const data = recDoc.data();
        const stepNum = parseInt(recDoc.id.split('-')[1] || '0');
        return {
          id: recDoc.id,
          stepNumber: stepNum,
          audioUri: data.fileUrl || data.audioUri || '',
          storagePath: data.storagePath,
          duration: data.duration || 0,
          transcriptionText: data.transcriptionText || '',
          type: data.type, // 'text' for text entries
          content: data.content, // Text content
          title: data.title, // Stage title
        };
      });

      // Check if this is a text-based session
      const hasTextEntries = recordingsData.some((rec) => rec.type === 'text');
      setIsTextBased(hasTextEntries);

      setRecordings(recordingsData);

      // Combine transcripts/text for display
      let combinedTranscript = '';

      if (hasTextEntries) {
        // Text-based entries: Don't set transcript (we'll display stages separately)
        // We'll use the recordings array directly in the UI
        combinedTranscript = ''; // Will display stages individually
      } else if (recordingsData.length === 1) {
        // Condition A: Single audio recording - just show the transcript
        const singleTranscript = recordingsData[0].transcriptionText;
        combinedTranscript = singleTranscript || 'Transcription not yet available. Please check back later.';
      } else {
        // Condition B/C: Multiple audio recordings - concatenate with stage labels
        const transcripts = recordingsData
          .map((rec) => {
            if (rec.transcriptionText) {
              return `Stage ${rec.stepNumber}: ${rec.transcriptionText}`;
            }
            return '';
          })
          .filter((text) => text.length > 0);

        combinedTranscript =
          transcripts.length > 0
            ? transcripts.join('\n\n')
            : 'Transcription not yet available. Please check back later.';
      }

      setTranscript(combinedTranscript);

      // Set session date
      setSessionDate(sessionData.createdAt?.toDate?.() || new Date());

      // Load counterfactual workflows
      if (sessionData.stageWorkflows) {
        setStageWorkflows(sessionData.stageWorkflows);
      }
      if (sessionData.counterfactualWorkflow) {
        setLegacyWorkflow(sessionData.counterfactualWorkflow);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading session data:', error);
      Alert.alert('Error', 'Failed to load session data. Please try again.');
      setLoading(false);
    }
  };

  // Get a fresh download URL from Firebase Storage
  const getFreshDownloadURL = async (recording: RecordingData): Promise<string> => {
    try {
      // If we have a storagePath, use it to get a fresh URL
      if (recording.storagePath) {
        const storageRef = ref(storage, recording.storagePath);
        const downloadUrl = await getDownloadURL(storageRef);
        console.log(`🔗 Generated fresh download URL for: ${recording.storagePath}`);
        return downloadUrl;
      }

      // Otherwise try to extract path from existing URL
      const existingUrl = recording.audioUri;
      if (existingUrl && existingUrl.includes('firebasestorage.googleapis.com')) {
        try {
          const url = new URL(existingUrl);
          const pathPart = url.pathname.split('/o/')[1];
          if (pathPart) {
            const cleanPath = decodeURIComponent(pathPart.split('?')[0]);
            const storageRef = ref(storage, cleanPath);
            const downloadUrl = await getDownloadURL(storageRef);
            console.log(`🔗 Generated fresh download URL from existing URL`);
            return downloadUrl;
          }
        } catch (parseError) {
          console.warn('⚠️ Could not parse storage path from URL:', parseError);
        }
      }

      // Check if we only have a local file path (not uploaded to cloud)
      if (existingUrl && (existingUrl.startsWith('file://') || existingUrl.startsWith('/'))) {
        console.warn('⚠️ Recording has local path only - not uploaded to cloud');
        throw new Error('Audio not uploaded');
      }

      // Return existing cloud URL as fallback only if it looks like a valid URL
      if (existingUrl && existingUrl.startsWith('http')) {
        console.log('⚠️ Using existing stored URL');
        return existingUrl;
      }

      throw new Error('No audio URL available');
    } catch (error) {
      console.error('❌ Error generating download URL:', error);
      throw error;
    }
  };

  // Helper function to play recording at a specific index with auto-advance
  const playRecordingAtIndex = async (index: number) => {
    console.log(`🎵 playRecordingAtIndex called with index: ${index}, recordings.length: ${recordings.length}`);

    if (index < 0 || index >= recordings.length) {
      // No more recordings to play - reset to beginning
      console.log('🎵 No more recordings to play, stopping');
      setIsPlaying(false);
      setCurrentRecordingIndex(0);
      return;
    }

    const recording = recordings[index];
    console.log(`🎵 Recording at index ${index}:`, { id: recording.id, audioUri: recording.audioUri?.substring(0, 50) });

    if (!recording.audioUri) {
      // Skip to next if no audio
      console.log('🎵 No audioUri, skipping to next');
      playRecordingAtIndex(index + 1);
      return;
    }

    try {
      // Get fresh download URL
      const audioUri = await getFreshDownloadURL(recording);
      console.log(`🎵 Got fresh URL for index ${index}:`, audioUri.substring(0, 80));

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        (status) => {
          // Handle playback status updates
          if (status.isLoaded && status.didJustFinish) {
            // Unload current sound and play next recording
            newSound.unloadAsync();
            setSound(null);
            playRecordingAtIndex(index + 1);
          }
        }
      );

      // Unload previous sound if exists
      if (sound) {
        console.log('🎵 Unloading previous sound');
        await sound.unloadAsync();
      }

      console.log(`🎵 Sound created successfully for index ${index}, setting state`);
      setSound(newSound);
      setCurrentRecordingIndex(index);
      setIsPlaying(true);
    } catch (error) {
      console.error(`Error playing recording ${index}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not uploaded')) {
        Alert.alert(
          'Audio Not Available',
          'This recording was not uploaded to the cloud. Please re-record this session.'
        );
      } else {
        Alert.alert('Playback Error', 'Could not play the audio recording.');
      }
      setIsPlaying(false);
    }
  };

  const handlePlayPause = async () => {
    console.log('🎵 handlePlayPause called', { sound: !!sound, isPlaying, recordingsLength: recordings.length });

    try {
      // If currently playing, pause it
      if (sound && isPlaying) {
        console.log('🎵 Pausing current sound');
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }

      // If paused, resume
      if (sound && !isPlaying) {
        console.log('🎵 Resuming paused sound');
        await sound.playAsync();
        setIsPlaying(true);
        return;
      }

      // Start new playback from the beginning
      if (recordings.length > 0) {
        console.log('🎵 Starting fresh playback from index 0');
        setCurrentRecordingIndex(0);
        await playRecordingAtIndex(0);
      } else {
        console.log('🎵 No recordings to play');
      }
    } catch (error) {
      console.error('🎵 Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Goal Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Goal</Text>
          <Text style={styles.goalText}>{goalName}</Text>
        </View>

        {/* Prompt Text */}
        <View style={styles.promptSection}>
          <Text style={styles.promptText}>
            Please describe in detail, without naming anyone: what happened, who was involved, when and where it took place, how you felt, and what you tried?
          </Text>
        </View>

        {/* Transcript Section (Audio) or Text Stages Section (Text) */}
        {isTextBased ? (
          <View style={styles.section}>
            <Text style={styles.label}>Your Written Reflection</Text>
            {recordings.map((recording, index) => (
              <View key={recording.id} style={styles.textStageCard}>
                <Text style={styles.textStageTitle}>{recording.title || `Stage ${recording.stepNumber}`}</Text>
                <Text style={styles.textStageContent}>{recording.content || '(No content)'}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.label}>Transcript</Text>
            <View style={styles.transcriptBox}>
              <Text style={styles.transcriptText}>{transcript}</Text>
              <View style={styles.transcriptFooter}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={20}
                    color="#3b82f6"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Counterfactual Workflow - Per-Stage Accordion */}
        <View style={styles.section}>
          <StageAccordion
            sessionNumber={sessionNumber}
            recordings={recordings}
            goalName={goalName}
            stageWorkflows={stageWorkflows}
            legacyWorkflow={legacyWorkflow}
            totalStages={recordings.length}
            onComplete={onComplete}
          />
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 17,
    color: '#3b82f6',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  goalText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  promptSection: {
    marginBottom: 16,
  },
  promptText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  transcriptBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  transcriptText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  transcriptFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textStageCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  textStageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textStageContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
});
