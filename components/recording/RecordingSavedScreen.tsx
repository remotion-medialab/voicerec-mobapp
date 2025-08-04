import React, { useEffect } from 'react';
import { View, Text, StatusBar } from 'react-native';
import { RecordingButton } from './RecordingButton';
import { RecentEntries } from './RecentEntries';
import { RecordingEntry } from '../../types/recording';

interface RecordingSavedScreenProps {
  recentEntries: RecordingEntry[];
  onStartNewRecording: () => void;
  onDismiss: () => void;
}

export const RecordingSavedScreen: React.FC<RecordingSavedScreenProps> = ({
  recentEntries,
  onStartNewRecording,
  onDismiss,
}) => {
  // Auto dismiss after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View className="flex-1 px-8">
        {/* Saved confirmation */}
        <View className="flex-1 items-center justify-center">
          {/* Checkmark and text */}
          <View className="mb-16 items-center">
            <Text className="mb-4 text-xl font-light text-blue-500">Recording saved. ✓</Text>
          </View>
        </View>

        {/* Recording button area */}
        <View className="mb-8 items-center">
          <RecordingButton state="idle" onPress={onStartNewRecording} />

          {/* Instruction text */}
          <Text className="mt-8 text-center text-lg text-blue-500">Tap to record a moment.</Text>
        </View>

        {/* Recent Entries */}
        <View className="flex-1">
          <RecentEntries entries={recentEntries} />
        </View>
      </View>
    </View>
  );
};
