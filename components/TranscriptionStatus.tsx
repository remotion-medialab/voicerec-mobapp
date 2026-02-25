import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface TranscriptionStatusProps {
  sessionNumber: number;
  stepNumber: number;
  onTranscriptionUpdate?: (transcriptionText: string) => void;
}

export const TranscriptionStatus: React.FC<TranscriptionStatusProps> = ({
  sessionNumber,
  stepNumber,
  onTranscriptionUpdate,
}) => {
  const { user } = useAuth();
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'error'>('pending');

  useEffect(() => {
    if (!user) return;

    // Listen to the recording doc that the backend Cloud Function writes to.
    // Path: users/{uid}/sessions/session{N}/recordings/step-{N}
    const docRef = doc(
      db,
      'users',
      user.uid,
      'sessions',
      `session${sessionNumber}`,
      'recordings',
      `step-${stepNumber}`
    );
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        if (data.transcriptionText) {
          setTranscriptionText(data.transcriptionText);
          setStatus('completed');
          onTranscriptionUpdate?.(data.transcriptionText);
        } else if (data.transcriptionStatus === 'processing') {
          setStatus('processing');
        } else if (data.transcriptionStatus === 'error') {
          setStatus('error');
        } else {
          setStatus('pending');
        }
      }
    });

    return () => unsubscribe();
  }, [user, sessionNumber, stepNumber]);

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
      case 'processing':
        return <ActivityIndicator size="small" color="#2196F3" />;
      case 'error':
        return <Ionicons name="alert-circle" size={20} color="#F44336" />;
      default:
        return <Ionicons name="time-outline" size={20} color="#757575" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Transcribed';
      case 'processing':
        return 'Transcribing...';
      case 'error':
        return 'Transcription failed';
      default:
        return 'Waiting for transcription';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        {getStatusIcon()}
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>

      {transcriptionText && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>Transcript:</Text>
          <Text style={styles.transcriptionText}>
            {transcriptionText}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  transcriptionContainer: {
    marginTop: 8,
  },
  transcriptionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  transcriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
