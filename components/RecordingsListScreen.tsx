import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingEntry } from '../types/recording';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { recordingService } from '../services/recording';
import { useAuth } from '../contexts/AuthContext';
import { Audio } from 'expo-av';

interface RecordingsListScreenProps {
  onBack: () => void;
  onPlayRecording: (recording: RecordingEntry) => void;
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// Strip time so we can compare two Date values by day only.
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Sunday-anchored start of the week containing `d`.
const startOfWeek = (d: Date) => {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
};

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export const RecordingsListScreen: React.FC<RecordingsListScreenProps> = ({
  onBack,
  onPlayRecording,
}) => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));

  useEffect(() => {
    if (!user) return;

    const loadRecordings = async () => {
      try {
        // Always read local first — it's the source of truth for anything not yet
        // synced to Firestore. Includes local-only recordings (no fileUrl yet) so
        // the user always sees what they recorded.
        const local = await recordingService.getLocalRecordings();
        const localEntries: RecordingEntry[] = (local ?? []).map((data: any) => ({
          id: data.id,
          timestamp: new Date(data.createdAt),
          duration: data.duration || 0,
          title: data.title,
          stepNumber: data.stepNumber,
          audioUri: data.fileUrl || data.audioUri,
        }));

        // Show local immediately so the UI never appears empty while Firestore loads.
        setRecordings(
          [...localEntries].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        );

        // Then merge in anything Firestore has, deduped by title+stepNumber.
        try {
          const recordingsRef = collection(db, 'recordings', user.uid, 'sessions');
          const snapshot = await getDocs(query(recordingsRef, orderBy('createdAt', 'desc')));
          const cloudEntries: RecordingEntry[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              timestamp: data.createdAt?.toDate() || new Date(),
              duration: data.duration || 0,
              title: data.title,
              stepNumber: data.stepNumber,
              audioUri: data.audioUri || data.fileUrl,
            };
          });

          const all = [...localEntries, ...cloudEntries];
          const seen = new Set<string>();
          const deduped = all.filter((e) => {
            const key = `${e.title ?? ''}|${e.stepNumber ?? ''}|${e.timestamp.getTime()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          setRecordings(deduped.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
        } catch (firestoreError) {
          console.warn('❌ Firestore unavailable, keeping local-only list:', firestoreError);
        }
      } catch (error) {
        console.error('Error loading recordings:', error);
        setRecordings([]);
      }
    };

    loadRecordings();
  }, [user]);

  // Pre-compute the set of days that have at least one recording, so the
  // dot under each calendar day is O(1) per render instead of O(recordings).
  const daysWithRecordings = useMemo(() => {
    const set = new Set<string>();
    recordings.forEach((r) => set.add(startOfDay(r.timestamp).toDateString()));
    return set;
  }, [recordings]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const dayRecordings = useMemo(
    () =>
      recordings.filter((r) => sameDay(r.timestamp, selectedDate)),
    [recordings, selectedDate]
  );

  // Group recordings into sessions (a session = one walk-through of the 5 steps).
  // Prefer the explicit `sessionId` written by new recordings. For legacy entries
  // without one, infer a session boundary when stepNumber resets to 0 or there
  // is a > 30 min gap from the previous entry.
  type Session = {
    key: string;
    steps: RecordingEntry[];
    startedAt: Date;
    totalDuration: number;
  };
  const daySessions: Session[] = useMemo(() => {
    if (dayRecordings.length === 0) return [];
    const asc = [...dayRecordings].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const groups: Record<string, RecordingEntry[]> = {};
    const order: string[] = [];
    let inferredIdx = 0;
    let lastKey: string | null = null;
    let lastTime = 0;
    let lastStep = -1;

    for (const r of asc) {
      let key: string;
      if (r.sessionId) {
        key = r.sessionId;
      } else {
        const gapMs = lastTime ? r.timestamp.getTime() - lastTime : 0;
        const stepReset = (r.stepNumber ?? 0) === 0 && lastStep >= 0;
        const bigGap = gapMs > 30 * 60 * 1000;
        if (!lastKey || stepReset || bigGap) {
          inferredIdx += 1;
          key = `inferred_${selectedDate.toDateString()}_${inferredIdx}`;
        } else {
          key = lastKey;
        }
      }
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(r);
      lastKey = key;
      lastTime = r.timestamp.getTime();
      lastStep = r.stepNumber ?? lastStep;
    }

    return order.map((key) => {
      const steps = groups[key].sort(
        (a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0)
      );
      return {
        key,
        steps,
        startedAt: steps.reduce(
          (min, s) => (s.timestamp < min ? s.timestamp : min),
          steps[0].timestamp
        ),
        totalDuration: steps.reduce((sum, s) => sum + (s.duration || 0), 0),
      };
    });
  }, [dayRecordings, selectedDate]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (k: string) =>
    setExpanded((prev) => ({ ...prev, [k]: !prev[k] }));

  // Inline player — plays the tapped step right inside this screen instead of
  // navigating to a new page. One Audio.Sound at a time.
  const soundRef = useRef<Audio.Sound | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const stopActive = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setActiveStepId(null);
    setIsPlaying(false);
    setProgress(0);
  };

  const playStep = async (step: RecordingEntry) => {
    // Tap the active step → toggle pause/play
    if (activeStepId === step.id && soundRef.current) {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
      return;
    }
    // New step → unload previous, load new
    await stopActive();
    const uri = (step as any).fileUrl || step.audioUri;
    if (!uri) {
      Alert.alert('Not ready', 'This step has no audio yet.');
      return;
    }
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, progressUpdateIntervalMillis: 200, positionMillis: 0 }
      );
      soundRef.current = sound;
      setActiveStepId(step.id);
      setIsPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        const dur = status.durationMillis || 1;
        setProgress(Math.min(1, (status.positionMillis || 0) / dur));
        if (status.didJustFinish) {
          setIsPlaying(false);
          setProgress(0);
        }
      });
    } catch (e) {
      Alert.alert('Playback error', e instanceof Error ? e.message : String(e));
      await stopActive();
    }
  };

  const formatTime = (timestamp: Date) =>
    timestamp.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}:${remaining.toString().padStart(2, '0')}`;
  };

  const today = startOfDay(new Date());
  const monthLabel = `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;

  const shiftWeek = (days: number) => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + days);
    setWeekStart(next);
  };

  const renderDay = (d: Date) => {
    const isSelected = sameDay(d, selectedDate);
    const isToday = sameDay(d, today);
    const hasRec = daysWithRecordings.has(d.toDateString());
    return (
      <TouchableOpacity
        key={d.toISOString()}
        onPress={() => setSelectedDate(startOfDay(d))}
        style={styles.dayCol}
        activeOpacity={0.7}>
        <Text style={[styles.dayLetter, isSelected && styles.dayLetterActive]}>
          {WEEKDAY_LETTERS[d.getDay()]}
        </Text>
        <View
          style={[
            styles.dayBubble,
            isSelected && styles.dayBubbleActive,
            !isSelected && isToday && styles.dayBubbleToday,
          ]}>
          <Text
            style={[
              styles.dayNumber,
              isSelected && styles.dayNumberActive,
              !isSelected && isToday && styles.dayNumberToday,
            ]}>
            {d.getDate()}
          </Text>
        </View>
        <View style={styles.dotSlot}>
          {hasRec && (
            <View style={[styles.dot, isSelected && styles.dotActive]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSession = ({ item, index }: { item: Session; index: number }) => {
    const isOpen = !!expanded[item.key];
    return (
      <View style={styles.sessionWrap}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => toggleExpanded(item.key)}
          activeOpacity={0.85}>
          <View style={styles.cardPlay}>
            <Text style={styles.sessionNumber}>{index + 1}</Text>
          </View>
          <View style={styles.cardMid}>
            <Text style={styles.cardTitle}>Session {index + 1}</Text>
            <Text style={styles.cardSub}>
              {formatTime(item.startedAt)} · {item.steps.length}{' '}
              {item.steps.length === 1 ? 'step' : 'steps'}
            </Text>
          </View>
          <Text style={styles.cardDuration}>{formatDuration(item.totalDuration)}</Text>
          <Ionicons
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color="#9ca3af"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
        {isOpen && (
          <View style={styles.steps}>
            {item.steps.map((step) => {
              const isActive = activeStepId === step.id;
              const showPause = isActive && isPlaying;
              return (
                <TouchableOpacity
                  key={step.id}
                  style={[styles.stepRow, isActive && styles.stepRowActive]}
                  onPress={() => playStep(step)}
                  activeOpacity={0.7}>
                  <View style={styles.stepDot}>
                    <Text style={styles.stepDotText}>
                      {(step.stepNumber ?? 0) + 1}
                    </Text>
                  </View>
                  <View style={styles.cardMid}>
                    <Text style={styles.stepTitle}>
                      Step {(step.stepNumber ?? 0) + 1}
                    </Text>
                    <Text style={styles.cardSub}>{formatTime(step.timestamp)}</Text>
                    {isActive && (
                      <View style={styles.miniTrack}>
                        <View
                          style={[
                            styles.miniFill,
                            { width: `${Math.round(progress * 100)}%` },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                  <Ionicons
                    name={showPause ? 'pause' : 'play'}
                    size={16}
                    color="#3b82f6"
                  />
                  <Text style={[styles.cardDuration, { marginLeft: 8 }]}>
                    {formatDuration(step.duration)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Ionicons name="home" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Month label + week shifters */}
      <View style={styles.monthRow}>
        <Text style={styles.monthText}>{monthLabel}</Text>
        <View style={styles.monthArrows}>
          <TouchableOpacity onPress={() => shiftWeek(-7)} hitSlop={10} style={styles.arrowBtn}>
            <Ionicons name="chevron-back" size={18} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setSelectedDate(today);
              setWeekStart(startOfWeek(today));
            }}
            hitSlop={10}
            style={styles.todayBtn}>
            <Text style={styles.todayText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => shiftWeek(7)} hitSlop={10} style={styles.arrowBtn}>
            <Ionicons name="chevron-forward" size={18} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Weekday strip */}
      <View style={styles.weekRow}>{weekDays.map(renderDay)}</View>

      {/* Day header */}
      <View style={styles.dayHeader}>
        <Text style={styles.dayHeaderTitle}>
          {sameDay(selectedDate, today)
            ? 'Today'
            : selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
        </Text>
        <Text style={styles.dayHeaderCount}>
          {daySessions.length}{' '}
          {daySessions.length === 1 ? 'session' : 'sessions'}
          {daySessions.length > 0 ? ` · ${dayRecordings.length} steps` : ''}
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={daySessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.key}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mic-outline" size={28} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {sameDay(selectedDate, today)
                ? 'No sessions yet today.'
                : 'No sessions on this day.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const ACCENT = '#3b82f6';
const ACCENT_SOFT = '#dbeafe';
const TEXT = '#1f2937';
const TEXT_MUTED = '#6b7280';
const TEXT_FAINT = '#9ca3af';
const SURFACE = '#f9fafb';
const HAIR = '#e5e7eb';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  monthRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthText: { fontSize: 22, fontWeight: '700', color: TEXT },
  monthArrows: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: { color: ACCENT, fontSize: 13, fontWeight: '600' },

  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 14,
    justifyContent: 'space-between',
  },
  dayCol: { flex: 1, alignItems: 'center', gap: 6 },
  dayLetter: { fontSize: 11, color: TEXT_FAINT, fontWeight: '600', letterSpacing: 0.5 },
  dayLetterActive: { color: TEXT },
  dayBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBubbleActive: { backgroundColor: ACCENT },
  dayBubbleToday: { borderWidth: 1, borderColor: ACCENT },
  dayNumber: { fontSize: 15, color: TEXT, fontWeight: '600' },
  dayNumberActive: { color: '#ffffff' },
  dayNumberToday: { color: ACCENT },
  dotSlot: { height: 6, justifyContent: 'center' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: ACCENT },
  dotActive: { backgroundColor: ACCENT },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: HAIR,
  },
  dayHeaderTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  dayHeaderCount: { fontSize: 13, color: TEXT_FAINT, fontWeight: '500' },

  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: HAIR,
    marginBottom: 10,
  },
  cardPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardMid: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: TEXT },
  cardSub: { fontSize: 13, color: TEXT_MUTED, marginTop: 2 },
  cardDuration: { fontSize: 14, color: TEXT_MUTED, fontWeight: '600', fontVariant: ['tabular-nums'] },

  empty: { alignItems: 'center', gap: 10, paddingTop: 40 },
  emptyText: { color: TEXT_FAINT, fontSize: 14 },

  sessionWrap: { marginBottom: 10 },
  sessionNumber: { color: ACCENT, fontWeight: '700', fontSize: 15 },
  steps: {
    marginTop: 6,
    marginLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: ACCENT_SOFT,
    paddingLeft: 12,
    gap: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: HAIR,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACCENT_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepDotText: { color: ACCENT, fontWeight: '700', fontSize: 12 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: TEXT },
  stepRowActive: { borderColor: ACCENT, backgroundColor: '#eff6ff' },
  miniTrack: {
    height: 3,
    marginTop: 6,
    backgroundColor: HAIR,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniFill: { height: 3, backgroundColor: ACCENT },
});
