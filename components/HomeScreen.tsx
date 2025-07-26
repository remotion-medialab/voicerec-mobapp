import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { logOut } from '../services/auth';

interface HomeScreenProps {
  onJournal: () => void;
  onViewRecordings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onJournal, onViewRecordings }) => {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await logOut();
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Error logging out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Main question */}
      <View style={styles.contentContainer}>
        <Text style={styles.questionText}>Hey, what&apos;s on your mind?</Text>

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.button} onPress={onJournal}>
            <Text style={styles.buttonText}>Journal</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={onViewRecordings}>
            <Text style={styles.buttonText}>View Recordings</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        {user && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 80,
  },
  buttonsContainer: {
    width: '100%',
    gap: 20,
  },
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 60,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
});
