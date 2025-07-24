import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingEntry } from '../types/recording';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
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
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<RecordingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadRecordings = async () => {
      try {
        console.log('📋 Loading recordings list for user:', user.uid);

        // Load recordings from UID path
        const recordingsRef = collection(db, 'recordings', user.uid, 'sessions');
        const q = query(recordingsRef, orderBy('createdAt', 'desc'));

        // Load local recordings from AsyncStorage first (only show uploaded ones)
        const localRecordings = await recordingService.getLocalRecordings();
        const localEntries: RecordingEntry[] = localRecordings
          .filter((data: any) => data.fileUrl && data.fileUrl.includes('firebasestorage.googleapis.com')) // Only uploaded recordings
          .map((data: any) => ({
            id: data.id,
            timestamp: new Date(data.createdAt),
            duration: data.duration || 0,
            title: data.title,
            stepNumber: data.stepNumber,
            audioUri: data.fileUrl, // Use Firebase Storage URL
          }));

        console.log('📱 Loaded', localEntries.length, 'local recordings in list');
        setRecordings(localEntries);
        setLoading(false);

        // Also try to load from Firestore for cloud recordings
        try {
          const snapshot = await getDocs(q);
          console.log('📦 Loaded', snapshot.docs.length, 'cloud recordings in list');
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

          // Merge local and cloud recordings, remove duplicates
          const allEntries = [...localEntries, ...cloudEntries];
          const uniqueEntries = allEntries.filter((entry, index, self) => 
            index === self.findIndex(e => e.title === entry.title && e.stepNumber === entry.stepNumber)
          );
          
          const sortedEntries = uniqueEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          
          setRecordings(sortedEntries);
        } catch (firestoreError) {
          console.warn('❌ Firestore not available, using local recordings only:', firestoreError);
          // Continue with local recordings only
        }

        const unsubscribe = () => {}; // No-op

        return () => unsubscribe();
      } catch (error) {
        console.error('Error loading recordings:', error);
        setRecordings([]);
        setLoading(false);
      }
    };

    loadRecordings();
  }, [user]);

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

  const renderRecording = ({ item }: { item: RecordingEntry }) => (
    <TouchableOpacity style={styles.recordingItem} onPress={() => onPlayRecording(item)}>
      <View style={styles.recordingContent}>
        <View style={styles.playButton}>
          <Ionicons name="play" size={20} color="#3b82f6" />
        </View>
        <View style={styles.recordingInfo}>
          <Text style={styles.recordingTime}>
            {formatTime(item.timestamp)} {formatDate(item.timestamp)}
          </Text>
        </View>
        <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
      </View>
    </TouchableOpacity>
  );

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
  duration: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});
