import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { RecordingState } from '../../types/recording';

interface RecordingButtonProps {
  state: RecordingState;
  onPress: () => void;
}

export const RecordingButton: React.FC<RecordingButtonProps> = ({ state, onPress }) => {
  const getButtonStyle = () => {
    switch (state) {
      case 'idle':
        return {
          outer: 'w-32 h-32 border-2 border-blue-500 rounded-full items-center justify-center',
          inner: 'w-24 h-24 bg-blue-200 rounded-full',
        };
      case 'recording':
      case 'active-recording':
        return {
          outer: 'w-32 h-32 border-2 border-blue-500 rounded-full items-center justify-center',
          inner: 'w-24 h-24 bg-blue-500 rounded-full',
        };
      default:
        return {
          outer: 'w-32 h-32 border-2 border-blue-500 rounded-full items-center justify-center',
          inner: 'w-24 h-24 bg-blue-200 rounded-full',
        };
    }
  };

  const styles = getButtonStyle();

  return (
    <TouchableOpacity onPress={onPress} className={styles.outer} activeOpacity={0.8}>
      <View className={styles.inner} />
    </TouchableOpacity>
  );
};
