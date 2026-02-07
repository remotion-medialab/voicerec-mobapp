import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  RefreshControl,
  Alert,
  ScrollView,
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
import { GoalService } from '../services/goals';
import { Goal } from '../types/goals';

interface RecordingsListScreenProps {
  onBack: () => void;
  onPlayRecording: (recording: RecordingEntry) => void;
  onViewSessionDetail: (sessionNumber: number) => void;
}

type GoalSection = {
  goalId: string | null; // null = Miscellaneous, '__DELETED__' = deleted goal
  goalName: string;
  sessions: Array<{
    sessionNumber: number;
    createdAt: Date;
    displayTitle: string;
    reflectionStatus?: number;
  }>;
};

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalSections, setGoalSections] = useState<GoalSection[]>([]);
  const [expandedGoals, setExpandedGoals] = useState<Set<string | null>>(new Set());

  const loadRecordings = useCallback(async () => {
    if (!user) return;
    try {
      console.log('Loading goals and sessions for user:', user.uid);
      setLoading(true);

      // Load goals and sessions in parallel
      const [goalsData, sessionsSnap] = await Promise.all([
        GoalService.getUserGoals(),
        getDocs(query(collection(db, 'users', user.uid, 'sessions'), orderBy('createdAt', 'desc')))
      ]);

      console.log(`Loaded ${goalsData.length} goals and ${sessionsSnap.docs.length} sessions`);

      // Build map of sessions by goalId
      const sessionsByGoalId = new Map<string | null, GoalSection['sessions']>();

      sessionsSnap.docs.forEach((sessionDoc) => {
        const sessionData = sessionDoc.data();
        const goalId = sessionData.goalId || null;
        const sessionItem = {
          sessionNumber: sessionData.sessionNumber,
          createdAt: sessionData.createdAt?.toDate?.() || new Date(),
          displayTitle: formatFriendlyDateTime(sessionData.createdAt?.toDate?.() || new Date()),
          reflectionStatus: sessionData.reflectionStatus ?? 0,
        };

        if (!sessionsByGoalId.has(goalId)) {
          sessionsByGoalId.set(goalId, []);
        }
        sessionsByGoalId.get(goalId)!.push(sessionItem);
      });

      // Sort sessions within each goal by date (most recent first)
      sessionsByGoalId.forEach((sessions) => {
        sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      });

      // Build goal sections array
      const sections: GoalSection[] = [];

      // Add sections for existing goals
      goalsData.forEach((goal) => {
        const sessionsForGoal = sessionsByGoalId.get(goal.id) || [];
        if (sessionsForGoal.length > 0) {
          sections.push({
            goalId: goal.id,
            goalName: goal.goal,
            sessions: sessionsForGoal,
          });
          sessionsByGoalId.delete(goal.id); // Remove processed
        }
      });

      // Handle deleted goals (sessions with goalId not in goals list)
      const deletedGoalSessions: GoalSection['sessions'] = [];
      sessionsByGoalId.forEach((sessions, goalId) => {
        if (goalId !== null) {
          // This is a non-null goalId that doesn't match any existing goal
          deletedGoalSessions.push(...sessions);
        }
      });

      if (deletedGoalSessions.length > 0) {
        deletedGoalSessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        sections.push({
          goalId: '__DELETED__',
          goalName: 'Goal (deleted)',
          sessions: deletedGoalSessions,
        });
      }

      // Add miscellaneous section at end
      const miscSessions = sessionsByGoalId.get(null) || [];
      if (miscSessions.length > 0) {
        sections.push({
          goalId: null,
          goalName: 'Miscellaneous',
          sessions: miscSessions,
        });
      }

      setGoals(goalsData);
      setGoalSections(sections);

      // For condition A users, also load individual recordings (keep existing logic)
      if (isConditionA) {
        console.log('Loading individual recordings for condition A user');
        const allRecordings: RecordingEntry[] = [];

        for (const session of sessionsSnap.docs) {
          const sessionData = session.data();
          const sessionNumber = sessionData.sessionNumber;

          const recsCol = collection(
            db,
            'users',
            user.uid,
            'sessions',
            `session${sessionNumber}`,
            'recordings'
          );
          const recsSnap = await getDocs(recsCol);

          recsSnap.docs.forEach((recDoc) => {
            const data = recDoc.data();
            const audioUrl = data.fileUrl || data.audioUri;
            if (audioUrl) {
              allRecordings.push({
                id: `session${sessionNumber}-${recDoc.id}`,
                timestamp: data.createdAt?.toDate?.() || new Date(),
                duration: data.duration || 0,
                title: data.title || 'Recording',
                stepNumber: data.stepNumber || 0,
                audioUri: audioUrl,
                fileUrl: data.fileUrl,
                storagePath: data.storagePath,
                sessionNumber: sessionNumber,
              });
            }
          });
        }

        allRecordings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setRecordings(allRecordings);
      }

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading goals and sessions:', error);
      setGoals([]);
      setGoalSections([]);
      setRecordings([]);
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isConditionA]);

  const toggleGoalExpansion = (goalId: string | null) => {
    setExpandedGoals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

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
        Alert.alert('No Audio', 'No audio URL available for this recording.');
        return;
      }

      // Check if this is a local file path that wasn't uploaded
      if (audioUri.startsWith('file://') || audioUri.startsWith('/')) {
        Alert.alert(
          'Audio Not Available',
          'This recording was not uploaded to the cloud. Please re-record this session.'
        );
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
      Alert.alert('Playback Error', 'Could not play this recording.');
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

  const renderGoalHeader = (section: GoalSection) => {
    const isExpanded = expandedGoals.has(section.goalId);

    return (
      <TouchableOpacity
        style={styles.goalHeader}
        onPress={() => toggleGoalExpansion(section.goalId)}
        activeOpacity={0.7}
      >
        <View style={styles.goalHeaderContent}>
          <Ionicons name="flag" size={20} color="#3b82f6" />
          <Text style={styles.goalHeaderTitle}>{section.goalName}</Text>
          <View style={styles.sessionCountBadge}>
            <Text style={styles.sessionCountText}>{section.sessions.length}</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6b7280"
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderGoalSection = (section: GoalSection) => {
    const isExpanded = expandedGoals.has(section.goalId);

    return (
      <View key={section.goalId || 'misc'} style={styles.goalSection}>
        {renderGoalHeader(section)}

        {isExpanded && (
          <View style={styles.sessionsContainer}>
            {section.sessions.map((session) => (
              <View key={session.sessionNumber}>
                {renderSession({ item: session })}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
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
        <Text style={styles.title}>Voice Recordings</Text>
        <Text style={styles.subtitle}>
          {isConditionA
            ? 'Tap a recording to play'
            : 'Tap a goal to expand and view its reflections'}
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
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {goalSections.map((section) => renderGoalSection(section))}
        </ScrollView>
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
  refreshButton: {
    padding: 8,
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
  goalSection: {
    marginBottom: 8,
  },
  goalHeader: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  goalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  goalHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  sessionCountBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  sessionCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  sessionsContainer: {
    paddingLeft: 8,
    gap: 8,
  },
});
