import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

interface RingInterfaceScreenProps {
  onBack: () => void;
}

type RingSample = {
  green?: number;
  red?: number;
  ir?: number;
  accX?: number;
  accY?: number;
  accZ?: number;
  gyroX?: number;
  gyroY?: number;
  gyroZ?: number;
};

type Metrics = {
  hr?: number | null;
  bp_sys?: number | null;
  bp_dia?: number | null;
  spo2?: number | null;
  resp_rate?: number | null;
  source?: string;
};

// IMPORTANT:
// This must be your laptop IP address, not localhost.
// Expo previously showed your laptop IP as 192.168.12.163.
const LAPTOP_BACKEND_WS_URL = 'ws://192.168.12.163:8765';
const RING_NAME = 'BCL603A959';

// Audio chunks are sent every few seconds so the backend can transcribe
// while the user is still talking.
const CHUNK_MS = 6000;

export const RingInterfaceScreen: React.FC<RingInterfaceScreenProps> = ({ onBack }) => {
  const [backendConnected, setBackendConnected] = useState(false);
  const [ringConnected, setRingConnected] = useState(false);
  const [status, setStatus] = useState('Opening interface...');
  const [packetCount, setPacketCount] = useState(0);

  const [sample, setSample] = useState<RingSample>({});
  const [metrics, setMetrics] = useState<Metrics>({});
  const [logs, setLogs] = useState<string[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingNotice, setRecordingNotice] = useState('Voice idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [lastTranscriptChunk, setLastTranscriptChunk] = useState('');
  const [voiceLabel, setVoiceLabel] = useState('—');
  const [stressScore, setStressScore] = useState('—');
  const [loadScore, setLoadScore] = useState('—');
  const [emotionScore, setEmotionScore] = useState('—');

  const wsRef = useRef<WebSocket | null>(null);
  const hasRequestedPairRef = useRef(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const isRecordingRef = useRef(false);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRotatingChunkRef = useRef(false);

  const sessionIdRef = useRef('');
  const chunkIndexRef = useRef(0);
  const voiceStartedAtRef = useRef<number | null>(null);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`${time} · ${message}`, ...prev].slice(0, 50));
  };

  // Fixed for Expo versions where FileSystem.EncodingType.Base64 is undefined.
  const fileToBase64 = async (uri: string) => {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    } as any);
  };

  const getAudioMimeType = () => {
    // Expo high quality recordings are usually m4a on both iOS and Android.
    if (Platform.OS === 'ios') return 'audio/m4a';
    return 'audio/m4a';
  };

  const startNewRecordingObject = async () => {
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    recordingRef.current = recording;
  };

  const sendAudioToBackend = async (uri: string, isFinal: boolean) => {
    const audioBase64 = await fileToBase64(uri);
    const now = Date.now() / 1000;
    const chunkIndex = chunkIndexRef.current++;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      addLog('Cannot send audio: backend is not connected');
      return;
    }

    wsRef.current.send(
      JSON.stringify({
        cmd: isFinal ? 'voice_session' : 'voice_audio_chunk',
        session_id: sessionIdRef.current,
        chunk_index: chunkIndex,
        trigger: 'double_wave_toggle',
        started_at: voiceStartedAtRef.current,
        ended_at: now,
        audio_mime_type: getAudioMimeType(),
        audio_base64: audioBase64,

        // These are empty for now. Backend still computes linguistic features
        // from transcript. Later we can compute acoustic features in-app too.
        acoustic_features: {},
      })
    );

    addLog(isFinal ? 'Final audio sent to backend' : `Audio chunk ${chunkIndex} sent to backend`);
  };

  const stopCurrentChunkAndSend = async (isFinal = false) => {
    const recording = recordingRef.current;
    if (!recording) {
      addLog('No active recording chunk to send');
      return;
    }

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) {
        addLog('Recording chunk had no URI');
        return;
      }

      await sendAudioToBackend(uri, isFinal);
    } catch (error) {
      addLog(`Audio chunk error: ${String(error)}`);
      setRecordingNotice(`Audio chunk error: ${String(error)}`);
    }
  };

  const rotateRecordingChunk = async () => {
    if (!isRecordingRef.current || isRotatingChunkRef.current) return;

    isRotatingChunkRef.current = true;

    try {
      await stopCurrentChunkAndSend(false);

      if (!isRecordingRef.current) return;

      await startNewRecordingObject();
      setRecordingNotice('Recording... backend is transcribing previous chunk');
    } catch (error) {
      addLog(`Could not rotate recording chunk: ${String(error)}`);
      setRecordingNotice(`Chunk rotation error: ${String(error)}`);
    } finally {
      isRotatingChunkRef.current = false;
    }
  };

  const startVoiceRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();

      if (!permission.granted) {
        addLog('Microphone permission denied');
        setRecordingNotice('Microphone permission denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      sessionIdRef.current = `session_${Date.now()}`;
      chunkIndexRef.current = 0;
      voiceStartedAtRef.current = Date.now() / 1000;

      setLiveTranscript('');
      setLastTranscriptChunk('');
      setVoiceLabel('listening...');
      setStressScore('—');
      setLoadScore('—');
      setEmotionScore('—');

      await startNewRecordingObject();

      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingNotice('Recording started. Speak now.');
      addLog('Voice recording started');

      chunkTimerRef.current = setInterval(() => {
        rotateRecordingChunk();
      }, CHUNK_MS);
    } catch (error) {
      addLog(`Could not start voice recording: ${String(error)}`);
      setRecordingNotice(`Could not start recording: ${String(error)}`);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      setRecordingNotice('Stopping recording and finalizing transcript...');

      isRecordingRef.current = false;
      setIsRecording(false);

      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }

      // Wait briefly if a chunk rotation is in progress.
      let guard = 0;
      while (isRotatingChunkRef.current && guard < 20) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        guard++;
      }

      await stopCurrentChunkAndSend(true);

      setRecordingNotice('Recording stopped. Final transcript is being saved.');
      addLog('Voice recording stopped');
    } catch (error) {
      addLog(`Could not stop voice recording: ${String(error)}`);
      setRecordingNotice(`Could not stop recording: ${String(error)}`);
    }
  };

  const toggleVoiceRecording = async () => {
    if (isRecordingRef.current) {
      await stopVoiceRecording();
    } else {
      await startVoiceRecording();
    }
  };

  const pairRing = () => {
    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      addLog('Backend is not connected yet');
      return;
    }

    ws.send(
      JSON.stringify({
        cmd: 'pair_ring',
        ring_name: RING_NAME,
        reset_first: false,
      })
    );

    setStatus('Connecting device...');
    addLog(`Auto-connect requested for ${RING_NAME}`);
  };

  const connectBackendAndAutoPair = () => {
    try {
      if (wsRef.current) {
        wsRef.current.close();
      }

      hasRequestedPairRef.current = false;
      setStatus('Connecting to local backend...');
      addLog(`Connecting to ${LAPTOP_BACKEND_WS_URL}`);

      const ws = new WebSocket(LAPTOP_BACKEND_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setBackendConnected(true);
        setStatus('Backend connected. Starting device stream...');
        addLog('Backend connected');

        if (!hasRequestedPairRef.current) {
          hasRequestedPairRef.current = true;

          // Delay gives the backend/websocket time to settle before BLE pairing.
          setTimeout(pairRing, 2000);
        }
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'status') {
            if (typeof msg.ring_connected === 'boolean') {
              setRingConnected(msg.ring_connected);
            }

            if (msg.ring_status) {
              setStatus(msg.ring_status);
              addLog(`Status: ${msg.ring_status}`);
            }

            if (msg.csv_path) {
              addLog(`Logging to: ${msg.csv_path}`);
            }

            if (msg.transcription && msg.transcription.ready === false) {
              addLog('Backend transcription not ready. Install faster-whisper.');
              setRecordingNotice('Backend transcription not ready. Install faster-whisper.');
            }

            return;
          }

          if (msg.type === 'realtime') {
            setPacketCount((prev) => prev + 1);

            if (msg.samples && msg.samples.length > 0) {
              setSample(msg.samples[msg.samples.length - 1]);
            }

            if (msg.metrics) {
              setMetrics(msg.metrics);
            }

            return;
          }

          if (msg.type === 'voice_trigger') {
            addLog(`Double-wave detected: ${msg.trigger}`);

            if (msg.trigger === 'double_wave_toggle') {
              await toggleVoiceRecording();
            }

            return;
          }

          if (msg.type === 'voice_partial') {
            const text = msg.text || '';
            const textPiece = msg.text_piece || '';

            if (text) {
              setLiveTranscript(text);
            }

            if (textPiece) {
              setLastTranscriptChunk(textPiece);
              setRecordingNotice('Live transcript updated');
              addLog(`Transcript chunk: ${textPiece}`);
            } else {
              setRecordingNotice('Audio processed. No speech detected in that chunk.');
              addLog('Audio chunk processed, no transcript text returned');
            }

            const fused = msg.fused_features || {};
            const ling = msg.linguistic_features || {};

            setVoiceLabel(fused.voice_state_label || ling.emotion_label || 'transcribing...');
            setStressScore(fused.stress_score?.toString() ?? '—');
            setLoadScore(fused.cognitive_load_score?.toString() ?? '—');
            setEmotionScore(fused.voice_emotional_load_score?.toString() ?? '—');

            return;
          }

          if (msg.type === 'voice_logged') {
            const text = msg.text || '';

            if (text) {
              setLiveTranscript(text);
              setLastTranscriptChunk('');
            }

            const fused = msg.fused_features || {};
            const ling = msg.linguistic_features || {};

            const stateLabel = fused.voice_state_label || ling.emotion_label || 'saved';
            const stress = fused.stress_score?.toString() ?? '—';
            const load = fused.cognitive_load_score?.toString() ?? '—';
            const emotion = fused.voice_emotional_load_score?.toString() ?? '—';

            setVoiceLabel(stateLabel);
            setStressScore(stress);
            setLoadScore(load);
            setEmotionScore(emotion);

            setRecordingNotice(`Saved. Affect: ${stateLabel}. Stress ${stress}, Load ${load}.`);
            addLog(`Voice transcript + affect logged. Affect: ${stateLabel}`);
            return;
          }
        } catch (error) {
          addLog(`Could not parse backend message: ${String(error)}`);
        }
      };

      ws.onerror = () => {
        setBackendConnected(false);
        setStatus('Backend connection error');
        addLog('WebSocket error. Is the Python backend running?');
      };

      ws.onclose = () => {
        setBackendConnected(false);
        setRingConnected(false);
        setStatus('Backend disconnected');
        addLog('Backend disconnected');
      };
    } catch (error) {
      setStatus('Connection failed');
      addLog(String(error));
    }
  };

  const disconnectRing = () => {
    const ws = wsRef.current;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ cmd: 'disconnect_ring' }));
      addLog('Disconnect requested');
    }
  };

  useEffect(() => {
    connectBackendAndAutoPair();

    return () => {
      try {
        if (chunkTimerRef.current) {
          clearInterval(chunkTimerRef.current);
          chunkTimerRef.current = null;
        }

        // Avoid async cleanup with recording unload here because React does not
        // wait for it. User should stop recording before leaving screen.
        wsRef.current?.close();
      } catch {}
    };
  }, []);

  const formatMetric = (value?: number | null, decimals = 1) => {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    return Number(value).toFixed(decimals);
  };

  const recordingBadgeStyle = isRecording ? styles.recordingBadgeOn : styles.recordingBadgeOff;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Ring Interface</Text>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              backendConnected && styles.backendDot,
              ringConnected && styles.ringDot,
            ]}
          />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connection</Text>
          <Text style={styles.smallText}>Backend: {LAPTOP_BACKEND_WS_URL}</Text>
          <Text style={styles.smallText}>Device: {RING_NAME}</Text>

          <View style={[styles.recordingBadge, recordingBadgeStyle]}>
            <Text style={styles.recordingBadgeText}>
              {isRecording ? '● Recording' : '○ Voice idle'}
            </Text>
          </View>

          <Text style={styles.noticeText}>{recordingNotice}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={connectBackendAndAutoPair}>
            <Text style={styles.primaryButtonText}>Reconnect + Start Logging</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.voiceButton} onPress={toggleVoiceRecording}>
            <Text style={styles.primaryButtonText}>
              {isRecording ? 'Stop Voice Recording' : 'Start Voice Recording'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={disconnectRing}>
            <Text style={styles.dangerButtonText}>Disconnect Device</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Transcript</Text>
          <Text style={styles.transcriptText}>
            {liveTranscript ||
              'Double-wave to start voice recording. Transcript will appear here as backend chunks return.'}
          </Text>

          {!!lastTranscriptChunk && (
            <>
              <Text style={styles.subLabel}>Latest chunk</Text>
              <Text style={styles.chunkText}>{lastTranscriptChunk}</Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Affect Summary</Text>
          <Text style={styles.affectLabel}>{voiceLabel}</Text>
          <View style={styles.affectRow}>
            <AffectPill label="Stress" value={stressScore} />
            <AffectPill label="Load" value={loadScore} />
            <AffectPill label="Emotion" value={emotionScore} />
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard label="Heart Rate" value={formatMetric(metrics.hr, 1)} unit="bpm" />
          <MetricCard
            label="Blood Pressure"
            value={
              metrics.bp_sys && metrics.bp_dia
                ? `${formatMetric(metrics.bp_sys, 0)}/${formatMetric(metrics.bp_dia, 0)}`
                : '—/—'
            }
            unit="mmHg"
          />
          <MetricCard label="SpO₂" value={formatMetric(metrics.spo2, 1)} unit="%" />
          <MetricCard label="Resp. Rate" value={formatMetric(metrics.resp_rate, 1)} unit="br/min" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Signals</Text>

          <View style={styles.signalRow}>
            <Signal label="Green" value={sample.green} />
            <Signal label="IR" value={sample.ir} />
            <Signal label="Red" value={sample.red} />
          </View>

          <View style={styles.signalRow}>
            <Signal label="Acc X" value={sample.accX} />
            <Signal label="Acc Y" value={sample.accY} />
            <Signal label="Acc Z" value={sample.accZ} />
          </View>

          <View style={styles.signalRow}>
            <Signal label="Gyro X" value={sample.gyroX} />
            <Signal label="Gyro Y" value={sample.gyroY} />
            <Signal label="Gyro Z" value={sample.gyroZ} />
          </View>

          <Text style={styles.smallText}>Packets received: {packetCount}</Text>
          <Text style={styles.smallText}>Metric source: {metrics.source || 'waiting'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>System Events</Text>
          {logs.length === 0 ? (
            <Text style={styles.smallText}>No events yet.</Text>
          ) : (
            logs.map((log, index) => (
              <Text key={`${log}-${index}`} style={styles.logText}>
                {log}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const MetricCard = ({ label, value, unit }: { label: string; value: string; unit: string }) => (
  <View style={styles.metricCard}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
    {!!unit && <Text style={styles.metricUnit}>{unit}</Text>}
  </View>
);

const Signal = ({ label, value }: { label: string; value?: number }) => (
  <View style={styles.signalBox}>
    <Text style={styles.signalLabel}>{label}</Text>
    <Text style={styles.signalValue}>
      {value === undefined || value === null ? '—' : Math.round(value).toLocaleString()}
    </Text>
  </View>
);

const AffectPill = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.affectPill}>
    <Text style={styles.affectPillLabel}>{label}</Text>
    <Text style={styles.affectPillValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fb',
  },
  header: {
    paddingTop: 64,
    paddingHorizontal: 22,
    paddingBottom: 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  backButtonText: {
    color: '#2563eb',
    fontSize: 17,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  statusRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9ca3af',
  },
  backendDot: {
    backgroundColor: '#f59e0b',
  },
  ringDot: {
    backgroundColor: '#22c55e',
  },
  statusText: {
    color: '#6b7280',
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    gap: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  recordingBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recordingBadgeOn: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  recordingBadgeOff: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recordingBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  noticeText: {
    marginTop: 10,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  voiceButton: {
    marginTop: 10,
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dangerButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 23,
    color: '#374151',
  },
  subLabel: {
    marginTop: 14,
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  chunkText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 12,
  },
  affectLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  affectRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  affectPill: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#edf2f7',
    borderRadius: 14,
    padding: 12,
  },
  affectPillLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  affectPillValue: {
    marginTop: 6,
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    marginTop: 8,
    fontSize: 23,
    color: '#111827',
    fontWeight: '800',
  },
  metricUnit: {
    marginTop: 2,
    fontSize: 13,
    color: '#9ca3af',
  },
  signalRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  signalBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  signalLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '700',
  },
  signalValue: {
    marginTop: 5,
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  smallText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 13,
  },
  logText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
    fontFamily: 'monospace',
  },
});
