import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { RecordingEntry } from '../../types/recording';

interface RecentEntriesProps {
  entries: RecordingEntry[];
  onEntryPress?: (entry: RecordingEntry) => void;
}

export const RecentEntries: React.FC<RecentEntriesProps> = ({ entries, onEntryPress }) => {
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Check if it's today
    if (entryDate.getTime() === today.getTime()) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm} Today`;
    }

    // Check if it's yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (entryDate.getTime() === yesterday.getTime()) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm} Yesterday`;
    }

    // For other dates
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm} ${months[date.getMonth()]} ${date.getDate()}`;
  };

  if (entries.length === 0) {
    return (
      <View className="flex-1 pt-8">
        <Text className="mb-6 text-2xl font-light text-blue-500">Recent Entries</Text>
        <Text className="mt-8 text-center text-lg text-gray-400">No recordings yet</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 pt-8">
      <Text className="mb-6 text-2xl font-light text-blue-500">Recent Entries</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {entries.map((entry, index) => (
          <TouchableOpacity
            key={entry.id}
            onPress={() => onEntryPress?.(entry)}
            className="py-4"
            activeOpacity={0.6}>
            <Text className="text-lg font-light text-blue-500">
              {formatTimestamp(entry.timestamp)}
            </Text>
            {index < entries.length - 1 && <View className="mt-4 h-px bg-gray-200" />}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
