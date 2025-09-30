import React from 'react';
import { View, Text, StatusBar, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GoalsScreenProps {
  onBack: () => void;
}

export const GoalsScreen: React.FC<GoalsScreenProps> = ({ onBack }) => {
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
        <Text style={styles.questionText}>What do you want to do?</Text>
      </View>

      {/* Bottom Buttons (identical styling, no logic) */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={[styles.button, styles.startButton]}>
          <Ionicons name="flag-outline" size={24} color="#9ca3af" style={styles.micIcon} />
          <Text style={styles.startButtonText}>Set New Goal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.doneButton]}>
          <Ionicons name="stats-chart-outline" size={24} color="#9ca3af" style={styles.micIcon} />
          <Text style={styles.doneButtonText}>Goals Dashboard</Text>
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
    paddingVertical: 40,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 32,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    minHeight: 200,
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    marginRight: 12,
  },
  startButtonText: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '400',
  },
  goalIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 20,
  },
  goalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  goalText: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
    marginRight: 12,
  },
  buttonsContainer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 8,
  },
  doneButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  doneButtonText: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '400',
  },
  restartButtonText: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '400',
  },
});
