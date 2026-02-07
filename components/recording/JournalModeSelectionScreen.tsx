import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface JournalModeSelectionScreenProps {
  onBack: () => void;
  onSelectRecord: () => void;
  onSelectWrite: () => void;
}

export const JournalModeSelectionScreen: React.FC<JournalModeSelectionScreenProps> = ({
  onBack,
  onSelectRecord,
  onSelectWrite,
}) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#3b82f6" />
          <Ionicons name="home" size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {/* Question Text */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{'How would you \n like to journal?'} </Text>
        <Text style={styles.subtitleText}>
          {'Choose your preferred method.'}
        </Text>
      </View>

      {/* Mode Selection Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Record Button */}
        <TouchableOpacity style={styles.modeButton} onPress={onSelectRecord} activeOpacity={0.7}>
          <Text style={styles.modeButtonTitle}>Let's record!</Text>
          <Text style={styles.modeButtonDescription}>Record audio reflections for each stage</Text>
        </TouchableOpacity>

        {/* Write Button */}
        <TouchableOpacity style={styles.modeButton} onPress={onSelectWrite} activeOpacity={0.7}>
          <Text style={styles.modeButtonTitle}>Let's write!</Text>
          <Text style={styles.modeButtonDescription}>Type your thoughts for each stage</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  questionContainer: {
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  subtitleText: {
    fontSize: 18,
    fontWeight: '300',
    color: '#9ca3af',
    textAlign: 'center',
  },
  buttonsContainer: {
    paddingHorizontal: 40,
    gap: 20,
  },
  modeButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modeButtonTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#9ca3af',
    marginBottom: 8,
  },
  modeButtonDescription: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
