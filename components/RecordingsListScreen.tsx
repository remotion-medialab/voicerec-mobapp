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
}

export const RecordingsListScreen: React.FC<RecordingsListScreenProps> = ({
  onBack,
  onPlayRecording,
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
      console.log('📋 Loading recordings list for user:', user.uid);
      // Aggregate from all sources and merge
      const aggregated: Array<{ id: string; data: any; source: string }> = [];
      // A) collection group (new structure)
      try {
        const cg = collectionGroup(db, 'recordings');
        const q1 = query(
          cg,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const snap = await getDocs(q1);
        snap.docs.forEach((d) => aggregated.push({ id: d.id, data: d.data(), source: 'cg' }));
      } catch (e) {
        console.warn('collectionGroup query failed (will still enumerate):', e);
      }
      // B) legacy flat path
      try {
        const recordingsRef = collection(db, 'recordings', user.uid, 'sessions');
        const q2 = query(recordingsRef, orderBy('createdAt', 'desc'));
        const snap = await getDocs(q2);
        snap.docs.forEach((d) => aggregated.push({ id: d.id, data: d.data(), source: 'legacy' }));
      } catch (e) {
        console.warn('legacy path query failed:', e);
      }
      // C) enumerate users/{uid}/sessions/*/recordings
      try {
        const sessionsCol = collection(db, 'users', user.uid, 'sessions');
        const sessionsSnap = await getDocs(sessionsCol);
        for (const sess of sessionsSnap.docs) {
          const recsCol = collection(doc(db, 'users', user.uid, 'sessions', sess.id), 'recordings');
          const recsSnap = await getDocs(recsCol);
          recsSnap.docs.forEach((d) =>
            aggregated.push({ id: d.id, data: d.data(), source: 'enum' })
          );
        }
      } catch (e) {
        console.warn('session enumeration failed:', e);
      }

      // Deduplicate by composite key (prefer cg > enum > legacy)
      const byKey = new Map<string, { id: string; data: any }>();
      for (const item of aggregated) {
        const data = item.data || {};
        const key =
          (data.recordingId as string) ||
          (data.storagePath as string) ||
          `${data.sessionNumber || 'session'}-${item.id}`;
        if (!byKey.has(key) || item.source === 'cg') {
          byKey.set(key, { id: key, data });
        }
      }
      const docsSource = Array.from(byKey.values());

      console.log('📦 Loaded', docsSource.length, 'cloud recordings in list (merged)');

      const cloudEntries: RecordingEntry[] = docsSource
        .map((docLike) => {
          const data = docLike.data;
          const audioUrl = data.fileUrl || data.audioUri;
          if (!audioUrl) return null;
          const createdAt: Date = data.createdAt?.toDate
            ? data.createdAt.toDate()
            : new Date(data.createdAt || Date.now());
          const compositeId =
            (data.recordingId as string) ||
            (data.storagePath as string) ||
            `${data.sessionNumber || 'session'}-${docLike.id}`;
          return {
            id: compositeId,
            timestamp: createdAt,
            duration: data.duration || 0,
            title: data.title || `Recording ${data.stepNumber || 'Unknown'}`,
            stepNumber: data.stepNumber || 0,
            audioUri: audioUrl,
            storagePath: data.storagePath,
            fileUrl: data.fileUrl,
            sessionNumber: data.sessionNumber,
          };
        })
        .filter(Boolean) as RecordingEntry[];

      const sortedEntries = cloudEntries.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
      );
      setRecordings(sortedEntries);

      // Group by sessionNumber and derive a display title based on first recording time
      const bySession = new Map<number, RecordingEntry[]>();
      for (const rec of sortedEntries) {
        const sn = (rec as any).sessionNumber as number | undefined;
        if (!sn) continue;
        if (!bySession.has(sn)) bySession.set(sn, []);
        bySession.get(sn)!.push(rec);
      }

      const sessionGroups: Array<{
        sessionNumber: number;
        createdAt: Date;
        displayTitle: string;
        recordings: RecordingEntry[];
      }> = [];
      bySession.forEach((recs, sn) => {
        // Earliest recording time within the session as the session start
        const createdAt = recs.reduce(
          (min, r) => (r.timestamp < min ? r.timestamp : min),
          recs[0].timestamp
        );
        const displayTitle = formatFriendlyDateTime(createdAt);
        // Sort steps ascending by stepNumber (ensure 1..5 ordering)
        const stepsSorted = [...recs].sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0));
        sessionGroups.push({ sessionNumber: sn, createdAt, displayTitle, recordings: stepsSorted });
      });

      // Sort sessions by createdAt desc
      sessionGroups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setSessions(sessionGroups);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading recordings:', error);
      setRecordings([]);
      setSessions([]);
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

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
    // Display stage title based on stepNumber (1..5) -> Stage0..4
    const displayIndex = Math.max(0, (item.stepNumber || 1) - 1);
    const stageName = STAGE_NAMES[displayIndex] || `stage-${displayIndex}`;
    return (
      <TouchableOpacity style={styles.recordingItem} onPress={() => playOrPause(item)}>
        <View style={styles.recordingContent}>
          <View style={styles.playButton}>
            <Ionicons name={isActive ? 'pause' : 'play'} size={20} color="#3b82f6" />
          </View>
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingTime}>
              {isConditionA
                ? formatFriendlyDateTime(item.timestamp)
                : `Stage${displayIndex}-${stageName}`}
            </Text>
          </View>
          <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSession = ({
    item,
  }: {
    item: { sessionNumber: number; createdAt: Date; displayTitle: string };
  }) => {
    return (
      <TouchableOpacity
        style={styles.recordingItem}
        onPress={() => setSelectedSessionNumber(item.sessionNumber)}>
        <View style={styles.recordingContent}>
          <View style={styles.playButton}>
            <Ionicons name="folder-open" size={20} color="#3b82f6" />
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
