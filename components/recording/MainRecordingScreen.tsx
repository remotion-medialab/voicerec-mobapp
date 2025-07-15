import React from 'react';
import { View, Text, StatusBar, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { RecordingButton } from './RecordingButton';
import { RecentEntries } from './RecentEntries';
import { Waveform } from './Waveform';
import { RecordingState, RecordingEntry } from '../../types/recording';
import { logOut } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';

interface MainRecordingScreenProps {
  recordingState: RecordingState;
  currentDuration: number;
  waveformData: number[];
  recentEntries: RecordingEntry[];
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const MainRecordingScreen: React.FC<MainRecordingScreenProps> = ({
  recordingState,
  currentDuration,
  waveformData,
  recentEntries,
  onStartRecording,
  onStopRecording,
}) => {
  const { userProfile } = useAuth();
  
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logOut();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isRecording = recordingState === 'recording' || recordingState === 'active-recording';
  const showWaveform = recordingState === 'active-recording';

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header with user info and logout */}
      <View className="px-8 pt-12 pb-4 flex-row justify-between items-center">
        <View>
          <Text className="text-lg font-semibold text-gray-800">
            {userProfile?.displayName || 'User'}
          </Text>
          <Text className="text-sm text-gray-500">
            ID: {userProfile?.participantId || 'N/A'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-500 px-4 py-2 rounded-lg"
        >
          <Text className="text-white font-medium">Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main content area */}
      <View className="flex-1 px-8">
        {/* Waveform area (only show when actively recording) */}
        {showWaveform && (
          <View className="pb-8 pt-16">
            <Waveform data={waveformData} />
          </View>
        )}

        {/* Timer (only show when recording) */}
        {isRecording && (
          <View className="mb-8 items-center">
            <Text className="text-2xl font-light text-blue-500">{formatTime(currentDuration)}</Text>
          </View>
        )}

        {/* Question prompt (only show when not recording) */}
        {!isRecording && (
          <View className="flex-1 items-center justify-center">
            <Text className="mb-16 px-4 text-center text-2xl font-light leading-relaxed text-blue-500">
              What is something you keep{'\n'}
              replaying in your head?
            </Text>
          </View>
        )}

        {/* Recording button area */}
        <View className="mb-8 items-center">
          <RecordingButton
            state={recordingState}
            onPress={isRecording ? onStopRecording : onStartRecording}
          />

          {/* Instruction text */}
          <Text className="mt-8 text-center text-lg text-blue-500">
            {isRecording ? 'Tap again to stop recording.' : 'Tap to record a moment.'}
          </Text>
        </View>

        {/* Recent Entries (only show when not actively recording) */}
        {!showWaveform && (
          <View className="flex-1">
            <RecentEntries entries={recentEntries} />
          </View>
        )}
      </View>
    </View>
  );
};
