import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { RecordingEntry } from '../types/recording';
import {
  collection,
  collectionGroup,
  query,
  orderBy,
  getDocs,
  where,
  doc,
  limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { recordingService } from '../services/recording';
import { useAuth } from '../contexts/AuthContext';

interface RecordingsListScreenProps {
  onBack: () => void;
  onPlayRecording: (recording: RecordingEntry) => void;
  onViewSessionDetail: (sessionNumber: number) => void;
}

export const RecordingsListScreen: React.FC<RecordingsListScreenProps> = ({
  onBack,
  onPlayRecording,
  onViewSessionDetail,
}) => {
  const { user, userProfile } = useAuth();
  const isConditionA = userProfile?.condition === 'A';
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [sessions, setSessions] = useState<
    Array<{
      sessionNumber: number;
      createdAt: Date;
      displayTitle: string;
      recordings: RecordingEntry[];
      reflectionStatus?: number; // 0=red, 1=yellow, 2=green
    }>
  >([]);
  const [selectedSessionNumber, setSelectedSessionNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);

  const loadRecordings = useCallback(async () => {
    if (!user) return;
    try {
      console.log('Loading sessions for user:', user.uid);
      setLoading(true);

      // OPTIMIZED: Only load session documents (not all recordings)
      const sessionsCol = collection(db, 'users', user.uid, 'sessions');
      const q = query(sessionsCol, orderBy('createdAt', 'desc'));
      const sessionsSnap = await getDocs(q);

      console.log(`Loaded ${sessionsSnap.docs.length} sessions`);

      const sessionGroups: Array<{
        sessionNumber: number;
        createdAt: Date;
        displayTitle: string;
        recordings: RecordingEntry[];
        reflectionStatus?: number;
      }> = [];

      // Process each session
      sessionsSnap.docs.forEach((sessionDoc) => {
        const sessionData = sessionDoc.data();
        const sessionNumber = sessionData.sessionNumber;
        const createdAt = sessionData.createdAt?.toDate?.() || new Date();
        const reflectionStatus = sessionData.reflectionStatus ?? 0; // Default to 0 (red) if not set

        sessionGroups.push({
          sessionNumber,
          createdAt,
          displayTitle: formatFriendlyDateTime(createdAt),
          recordings: [], // Loaded lazily when drilling into session
          reflectionStatus,
        });
      });

      // Sort sessions by createdAt desc
      sessionGroups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setSessions(sessionGroups);

      // For condition A users, also load individual recordings
      if (isConditionA) {
        console.log('Loading individual recordings for condition A user');
        const allRecordings: RecordingEntry[] = [];

        for (const session of sessionGroups) {
          const recsCol = collection(
            db,
            'users',
            user.uid,
            'sessions',
            `session${session.sessionNumber}`,
            'recordings'
          );
          const recsSnap = await getDocs(recsCol);

          recsSnap.docs.forEach((recDoc) => {
            const data = recDoc.data();
            const audioUrl = data.fileUrl || data.audioUri;
            if (audioUrl) {
              allRecordings.push({
                id: `session${session.sessionNumber}-${recDoc.id}`, // Make ID unique across sessions
                timestamp: data.createdAt?.toDate?.() || new Date(),
                duration: data.duration || 0,
                title: data.title || 'Recording',
                stepNumber: data.stepNumber || 0,
                audioUri: audioUrl,
                fileUrl: data.fileUrl,
                storagePath: data.storagePath,
                sessionNumber: session.sessionNumber, // Add session number for navigation
              });
            }
          });
        }

        // Sort recordings by timestamp
        allRecordings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setRecordings(allRecordings);
      }

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setRecordings([]);
      setSessions([]);
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isConditionA]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Refetch when screen regains focus (simple heuristic)
  useEffect(() => {
    const unsubscribe = () => {};
    // If integrating with navigation library, hook into focus event here
    // For now, refetch on mount is sufficient
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecordings();
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playOrPause = async (item: RecordingEntry) => {
    try {
      // If tapping the same active recording, toggle play/pause
      if (activeRecordingId === item.id && sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && (status as any).isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      // Stop any currently loaded sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }

      // Use stored URL directly (already a download URL)
      const audioUri = item.fileUrl || item.audioUri;
      if (!audioUri) {
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
      setActiveRecordingId(item.id);
    } catch (e) {
      console.warn('Playback error:', e);
      setIsPlaying(false);
      setActiveRecordingId(null);
    }
  };

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

  const formatFriendlyDateTime = (timestamp: Date) => {
    const month = timestamp.toLocaleDateString('en-US', { month: 'short' });
    const day = timestamp.getDate();
    const suffix = (d: number) => {
      const j = d % 10,
        k = d % 100;
      if (j === 1 && k !== 11) return 'st';
      if (j === 2 && k !== 12) return 'nd';
      if (j === 3 && k !== 13) return 'rd';
      return 'th';
    };
    const time = timestamp
      .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      .toLowerCase();
    return `${month} ${day}${suffix(day)} ${time}`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `0:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const STAGE_NAMES = ['situation', 'modification', 'attention', 'interpretation', 'response'];

  const renderRecording = ({ item }: { item: RecordingEntry }) => {
    const isActive = activeRecordingId === item.id && isPlaying;
    // Display stage title based on stepNumber (0..4) -> Stage0..4
    const displayIndex = item.stepNumber ?? 0;
    const stageName = STAGE_NAMES[displayIndex] || `stage-${displayIndex}`;

    // For condition A: Navigate to detail screen instead of playing audio
    const handleRecordingPress = () => {
      if (isConditionA && item.sessionNumber) {
        onViewSessionDetail(item.sessionNumber);
      } else {
        playOrPause(item);
      }
    };

    // Get reflection status for condition A recordings
    const getStatusColor = (status?: number) => {
      switch (status) {
        case 2:
          return '#10b981'; // Green
        case 1:
          return '#f59e0b'; // Yellow
        case 0:
        default:
          return '#ef4444'; // Red
      }
    };

    // Find the session for this recording to get its reflectionStatus
    const session = sessions.find((s) => s.sessionNumber === item.sessionNumber);
    const statusColor = isConditionA && session ? getStatusColor(session.reflectionStatus) : undefined;

    return (
      <TouchableOpacity style={styles.recordingItem} onPress={handleRecordingPress}>
        <View
          style={[
            styles.recordingContent,
            statusColor && { borderLeftWidth: 4, borderLeftColor: statusColor },
          ]}
        >
          <View style={styles.playButton}>
            <Ionicons
              name={isConditionA ? 'document-text' : isActive ? 'pause' : 'play'}
              size={20}
              color="#3b82f6"
            />
          </View>
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingTime}>
              {isConditionA
                ? formatFriendlyDateTime(item.timestamp)
                : `Stage${displayIndex}-${stageName}`}
            </Text>
            {isConditionA && <Text style={styles.sessionSubtext}>Tap to view reflection</Text>}
          </View>
          {isConditionA ? (
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          ) : (
            <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSession = ({
    item,
  }: {
    item: { sessionNumber: number; createdAt: Date; displayTitle: string; reflectionStatus?: number };
  }) => {
    // Determine status color: 0=red, 1=yellow, 2=green
    const getStatusColor = (status?: number) => {
      switch (status) {
        case 2:
          return '#10b981'; // Green
        case 1:
          return '#f59e0b'; // Yellow
        case 0:
        default:
          return '#ef4444'; // Red
      }
    };

    const statusColor = getStatusColor(item.reflectionStatus);

    return (
      <TouchableOpacity
        style={styles.recordingItem}
        onPress={() => onViewSessionDetail(item.sessionNumber)}>
        <View style={[styles.recordingContent, { borderLeftWidth: 4, borderLeftColor: statusColor }]}>
          <View style={styles.playButton}>
            <Ionicons name="document-text" size={20} color="#3b82f6" />
          </View>
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingTime}>{item.displayTitle}</Text>
            <Text style={styles.sessionSubtext}>5-stage reflection</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
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
          <Text style={styles.subtitle}>Loading from cloud...</Text>
        </View>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your recordings from cloud storage...</Text>
        </View>
      </View>
    );
  }

  const isInSessionView = !isConditionA && selectedSessionNumber != null;
  const selectedSession = isInSessionView
    ? sessions.find((s) => s.sessionNumber === selectedSessionNumber) || null
    : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (isInSessionView) {
              setSelectedSessionNumber(null);
            } else {
              onBack();
            }
          }}
          style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Ionicons name="home" size={20} color="#3b82f6" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          {isInSessionView ? selectedSession?.displayTitle || 'Session' : 'Voice Recordings'}
        </Text>
        <Text style={styles.subtitle}>
          {isInSessionView
            ? 'Stage0–4 within one reflection'
            : isConditionA
              ? 'Tap a recording to play'
              : 'Tap a session (e.g., Aug 10th 7:32pm) to view its 5 stages'}
        </Text>
      </View>

      {/* Sessions or Session Recordings */}
      {isConditionA ? (
        <FlatList
          data={recordings}
          renderItem={renderRecording}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : isInSessionView ? (
        <FlatList
          data={sessions.find((s) => s.sessionNumber === selectedSessionNumber)?.recordings || []}
          renderItem={renderRecording}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        <FlatList
          data={sessions.map((s) => ({
            sessionNumber: s.sessionNumber,
            createdAt: s.createdAt,
            displayTitle: s.displayTitle,
            reflectionStatus: s.reflectionStatus,
          }))}
          renderItem={renderSession}
          keyExtractor={(item) => `session-${item.sessionNumber}`}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
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
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  recordingInfo: {
    flex: 1,
  },
  recordingTime: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  sessionSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  duration: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});
