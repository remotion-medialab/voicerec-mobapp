import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { GoalService } from '../services/goals';

interface RecordingsListScreenProps {
  onBack: () => void;
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
  onViewSessionDetail,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

      setGoalSections(sections);

      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading goals and sessions:', error);
      setGoalSections([]);
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

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
            <Text style={styles.sessionSubtext}>3-stage reflection</Text>
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
          Tap a goal to expand and view its reflections
        </Text>
      </View>

      {/* Sessions grouped by goal */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {goalSections.map((section) => renderGoalSection(section))}
      </ScrollView>
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
