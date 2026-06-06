import React from 'react';
import { View, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './theme';

interface NoteInputProps {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Show a decorative mic glyph (text-only mode — typing replaces dictation). */
  showMic?: boolean;
}

/** Light rounded multiline text box used for all free-text / "voice" notes. */
export const NoteInput: React.FC<NoteInputProps> = ({
  value,
  onChangeText,
  placeholder,
  minHeight = 96,
  showMic,
}) => (
  <View
    style={{
      backgroundColor: colors.field,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    }}>
    <View className="flex-row">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.kicker}
        multiline
        textAlignVertical="top"
        style={{ flex: 1, minHeight, color: colors.ink, fontSize: 15, lineHeight: 21 }}
      />
      {showMic ? (
        <View
          className="ml-2 h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: '#E2E5EC' }}>
          <Ionicons name="mic" size={16} color={colors.subtle} />
        </View>
      ) : null}
    </View>
  </View>
);
